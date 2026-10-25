package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedQuotaData(t *testing.T, rows ...QuotaData) {
	t.Helper()
	for i := range rows {
		require.NoError(t, DB.Create(&rows[i]).Error)
	}
}

// TestGetQuotaUsageBreakdownReadsQuotaDataNotLogs 锁死分布面板的数据口径：
// 分布数据必须取自 quota_data（与看板统计卡片、柱状图同源），而不是实时的 logs 表。
func TestGetQuotaUsageBreakdownReadsQuotaDataNotLogs(t *testing.T) {
	truncateTables(t)

	seedQuotaData(t, QuotaData{
		UserID: 1, Username: "alice", ModelName: "gpt-a", UseGroup: "vip",
		CreatedAt: 1000, Count: 3, Quota: 300, TokenUsed: 3000,
	})
	require.NoError(t, DB.Create(&Log{
		UserId: 1, Username: "alice", ModelName: "gpt-a", Group: "vip",
		CreatedAt: 1000, Type: LogTypeConsume, Quota: 9999, PromptTokens: 1, CompletionTokens: 2,
	}).Error)

	modelBreakdown, groupBreakdown, err := GetQuotaUsageBreakdown(0, 2000, "")
	require.NoError(t, err)

	require.Len(t, modelBreakdown, 1)
	assert.Equal(t, "gpt-a", modelBreakdown[0].Name)
	assert.Equal(t, 3, modelBreakdown[0].Count)
	assert.Equal(t, 300, modelBreakdown[0].Quota, "分布金额必须来自 quota_data，不能取自 logs")
	assert.Equal(t, 3000, modelBreakdown[0].Tokens)

	require.Len(t, groupBreakdown, 1)
	assert.Equal(t, "vip", groupBreakdown[0].Name)
	assert.Equal(t, 300, groupBreakdown[0].Quota)
}

// TestGetQuotaUsageBreakdownSumsMatchSummaryCards 锁死口径一致性：
// 模型分布与分组分布的合计必须与看板统计卡片（GetAllQuotaDates 汇总）完全相等。
func TestGetQuotaUsageBreakdownSumsMatchSummaryCards(t *testing.T) {
	truncateTables(t)

	seedQuotaData(t,
		QuotaData{
			UserID: 1, Username: "alice", ModelName: "gpt-a", UseGroup: "vip",
			CreatedAt: 1000, Count: 2, Quota: 100, TokenUsed: 40,
		},
		QuotaData{
			UserID: 1, Username: "alice", ModelName: "gpt-b", UseGroup: "vip",
			CreatedAt: 2000, Count: 1, Quota: 50, TokenUsed: 20,
		},
		QuotaData{
			UserID: 2, Username: "bob", ModelName: "gpt-a", UseGroup: "default",
			CreatedAt: 3000, Count: 4, Quota: 200, TokenUsed: 80,
		},
	)

	modelBreakdown, groupBreakdown, err := GetQuotaUsageBreakdown(0, 4000, "")
	require.NoError(t, err)

	cards, err := GetAllQuotaDates(0, 4000, "")
	require.NoError(t, err)

	var cardQuota, cardCount, cardTokens int
	for _, item := range cards {
		cardQuota += item.Quota
		cardCount += item.Count
		cardTokens += item.TokenUsed
	}

	for _, breakdown := range [][]UsageBreakdownItem{modelBreakdown, groupBreakdown} {
		var quota, count, tokens int
		for _, item := range breakdown {
			quota += item.Quota
			count += item.Count
			tokens += item.Tokens
		}
		assert.Equal(t, cardQuota, quota, "分布金额合计必须等于统计卡片总额度")
		assert.Equal(t, cardCount, count, "分布请求数合计必须等于统计卡片总数")
		assert.Equal(t, cardTokens, tokens, "分布 Token 合计必须等于统计卡片总 Token")
	}
}

// TestGetQuotaUsageBreakdownNormalizesEmptyDimensions 空维度不能被丢弃，
// 否则各行之和会小于统计卡片总数；统一归一为 sentinel 交由前端翻译。
func TestGetQuotaUsageBreakdownNormalizesEmptyDimensions(t *testing.T) {
	truncateTables(t)

	seedQuotaData(t,
		QuotaData{
			UserID: 1, Username: "alice", ModelName: "gpt-a", UseGroup: "vip",
			CreatedAt: 1000, Count: 1, Quota: 100, TokenUsed: 10,
		},
		QuotaData{
			UserID: 1, Username: "alice", ModelName: "", UseGroup: "",
			CreatedAt: 2000, Count: 1, Quota: 20, TokenUsed: 5,
		},
	)

	modelBreakdown, groupBreakdown, err := GetQuotaUsageBreakdown(0, 3000, "")
	require.NoError(t, err)

	require.Len(t, modelBreakdown, 2)
	assert.Equal(t, "gpt-a", modelBreakdown[0].Name)
	assert.Equal(t, 100, modelBreakdown[0].Quota)
	assert.Equal(t, "__unknown__", modelBreakdown[1].Name)

	require.Len(t, groupBreakdown, 2)
	assert.Equal(t, "vip", groupBreakdown[0].Name)
	assert.Equal(t, "__ungrouped__", groupBreakdown[1].Name)
}

// TestGetQuotaUsageBreakdownFiltersByRangeAndUser 时间范围与用户过滤必须生效。
func TestGetQuotaUsageBreakdownFiltersByRangeAndUser(t *testing.T) {
	truncateTables(t)

	seedQuotaData(t,
		QuotaData{
			UserID: 1, Username: "alice", ModelName: "gpt-a", UseGroup: "vip",
			CreatedAt: 1000, Count: 1, Quota: 100, TokenUsed: 10,
		},
		QuotaData{
			UserID: 2, Username: "bob", ModelName: "gpt-b", UseGroup: "default",
			CreatedAt: 5000, Count: 1, Quota: 200, TokenUsed: 20,
		},
	)

	modelBreakdown, _, err := GetQuotaUsageBreakdown(0, 2000, "")
	require.NoError(t, err)
	require.Len(t, modelBreakdown, 1)
	assert.Equal(t, "gpt-a", modelBreakdown[0].Name)

	modelBreakdown, _, err = GetQuotaUsageBreakdown(0, 6000, "bob")
	require.NoError(t, err)
	require.Len(t, modelBreakdown, 1)
	assert.Equal(t, "gpt-b", modelBreakdown[0].Name)
}
