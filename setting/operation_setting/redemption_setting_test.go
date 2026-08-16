package operation_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestRedemptionTiersDefaults 验证默认档位与开关，以及 IsConfiguredRedemptionTier 判定。
func TestRedemptionTiersDefaults(t *testing.T) {
	orig := redemptionSetting
	t.Cleanup(func() { redemptionSetting = orig })

	assert.Equal(t, []float64{5, 10, 20, 50, 100, 500}, GetRedemptionTiers())
	assert.True(t, IsRedemptionEnabled())
	assert.True(t, IsConfiguredRedemptionTier(5))
	assert.True(t, IsConfiguredRedemptionTier(100))
	assert.False(t, IsConfiguredRedemptionTier(7))
	assert.False(t, IsConfiguredRedemptionTier(0))
}

// TestRedemptionTiersAndSwitchRoundTrip 验证档位与开关的 Set/Get 回写（配置系统路径）。
func TestRedemptionTiersAndSwitchRoundTrip(t *testing.T) {
	orig := redemptionSetting
	t.Cleanup(func() { redemptionSetting = orig })

	SetRedemptionTiers([]float64{3, 6, 9})
	SetRedemptionEnabled(false)

	assert.Equal(t, []float64{3, 6, 9}, GetRedemptionTiers())
	assert.True(t, IsConfiguredRedemptionTier(3))
	assert.False(t, IsConfiguredRedemptionTier(5))
	assert.False(t, IsRedemptionEnabled())
}
