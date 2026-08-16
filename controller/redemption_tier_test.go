package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// setupRedemptionControllerTest 提供独立 SQLite 内存库，隔离 controller 测试数据。
func setupRedemptionControllerTest(t *testing.T) {
	t.Helper()
	oldDB := model.DB
	oldLogDB := model.LOG_DB
	oldRedisEnabled := common.RedisEnabled
	common.RedisEnabled = false
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Redemption{}, &model.User{}, &model.TopUp{}, &model.Log{}))
	model.DB = db
	model.LOG_DB = db
	t.Cleanup(func() {
		model.DB = oldDB
		model.LOG_DB = oldLogDB
		common.RedisEnabled = oldRedisEnabled
		sqlDB, dbErr := db.DB()
		if dbErr == nil {
			require.NoError(t, sqlDB.Close())
		}
	})
}

func TestAddRedemptionTierMoneyValid(t *testing.T) {
	setupRedemptionControllerTest(t)

	origTiers := operation_setting.GetRedemptionTiers()
	operation_setting.SetRedemptionTiers([]float64{5, 10})
	operation_setting.SetRedemptionEnabled(true)
	t.Cleanup(func() {
		operation_setting.SetRedemptionTiers(origTiers)
	})

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Set("id", 42)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/redemption",
		strings.NewReader(`{"name":"tier-code","count":2,"tier_money":5}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	AddRedemption(ctx)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.True(t, strings.Contains(recorder.Body.String(), `"success":true`), recorder.Body.String())

	// 2 个码，每个 Quota = tier_money * QuotaPerUnit = 5 * 500000。
	var redemptions []model.Redemption
	require.NoError(t, model.DB.Where("name = ?", "tier-code").Find(&redemptions).Error)
	require.Len(t, redemptions, 2)
	for _, r := range redemptions {
		assert.Equal(t, 2500000, r.Quota)
	}
}

func TestAddRedemptionTierMoneyInvalidRejected(t *testing.T) {
	setupRedemptionControllerTest(t)

	origTiers := operation_setting.GetRedemptionTiers()
	operation_setting.SetRedemptionTiers([]float64{5, 10})
	operation_setting.SetRedemptionEnabled(true)
	t.Cleanup(func() {
		operation_setting.SetRedemptionTiers(origTiers)
	})

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Set("id", 42)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/redemption",
		strings.NewReader(`{"name":"tier-bad","count":1,"tier_money":7}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	AddRedemption(ctx)

	assert.Equal(t, http.StatusOK, recorder.Code)
	// TranslateMessage 在测试环境返回 key 本身。
	assert.True(t, strings.Contains(recorder.Body.String(), `"message":"redemption.tier_invalid"`), recorder.Body.String())
}

func TestGetTopUpInfoReturnsRedemptionFields(t *testing.T) {
	setupRedemptionControllerTest(t)

	origTiers := operation_setting.GetRedemptionTiers()
	operation_setting.SetRedemptionTiers([]float64{5, 20})
	operation_setting.SetRedemptionEnabled(true)
	t.Cleanup(func() {
		operation_setting.SetRedemptionTiers(origTiers)
	})

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Set("id", 42)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/user/topup/info", nil)

	GetTopUpInfo(ctx)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.True(t, strings.Contains(recorder.Body.String(), `"enable_redemption":true`), recorder.Body.String())
	assert.True(t, strings.Contains(recorder.Body.String(), `"redemption_tiers":[5,20]`), recorder.Body.String())
}
