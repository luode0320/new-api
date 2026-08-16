package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// RedemptionSetting 兑换码业务配置：面额档位与独立启用开关。
// 档位用于链动小铺等外跳收款场景下管理员按预设面额一键批量生成兑换码；
// EnableRedemption 使兑换码功能独立于支付合规条款，关闭支付渠道后仍可用。
type RedemptionSetting struct {
	// RedemptionTiers 兑换码面额档位（美元），管理员可在后台配置
	RedemptionTiers []float64 `json:"redemption_tiers"`
	// EnableRedemption 兑换码功能独立开关
	EnableRedemption bool `json:"enable_redemption"`
}

// 默认配置：档位 $5/$10/$20/$50/$100/$500，兑换码默认开启
var redemptionSetting = RedemptionSetting{
	RedemptionTiers:  []float64{5, 10, 20, 50, 100, 500},
	EnableRedemption: true,
}

func init() {
	config.GlobalConfig.Register("redemption_setting", &redemptionSetting)
}

func GetRedemptionSetting() *RedemptionSetting {
	return &redemptionSetting
}

// GetRedemptionTiers 返回当前兑换码面额档位
func GetRedemptionTiers() []float64 {
	return redemptionSetting.RedemptionTiers
}

// SetRedemptionTiers 更新兑换码面额档位（运行时生效，由配置系统回写）
func SetRedemptionTiers(tiers []float64) {
	redemptionSetting.RedemptionTiers = tiers
}

// IsConfiguredRedemptionTier 判断给定面额是否为已配置档位之一
func IsConfiguredRedemptionTier(money float64) bool {
	for _, tier := range redemptionSetting.RedemptionTiers {
		if tier == money {
			return true
		}
	}
	return false
}

// IsRedemptionEnabled 判断兑换码功能是否开启
func IsRedemptionEnabled() bool {
	return redemptionSetting.EnableRedemption
}

// SetRedemptionEnabled 更新兑换码功能开关（运行时生效，由配置系统回写）
func SetRedemptionEnabled(enabled bool) {
	redemptionSetting.EnableRedemption = enabled
}
