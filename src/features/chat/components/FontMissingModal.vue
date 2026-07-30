<template>
	<div v-if="visible" class="font-modal-overlay">
		<div class="font-modal">
			<div class="font-modal-header">
				<div class="font-modal-title">排版字体缺失</div>
				<button class="font-modal-close" @click="$emit('close')">×</button>
			</div>
			<div class="font-modal-body">
				<span class="font-modal-desc">检测到您的设备缺少以下字体，排版效果不佳：</span>
				<div class="font-list">
					<div v-for="font in fonts" :key="font" class="font-item">{{ font }}</div>
				</div>
				<div class="font-modal-tip">请从字体版权方或单位授权渠道自行安装下列字体：</div>
				<div class="font-modal-tip">1. 点击【安装说明】查看所需字体名称</div>
				<div class="font-modal-tip">2. 安装字体后关闭全部 WPS 应用并重新启动</div>
				<div class="font-modal-tip">3. 本插件不附带或分发商用字体文件</div>
				<div class="font-modal-tip">注：字体缺失时默认回退到系统可用的相近字体。</div>
			</div>
			<div class="font-modal-actions">
				<button class="download-btn" @click="$emit('download')">安装说明</button>
				<button class="ignore-btn" @click="$emit('ignore')">忽略</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'FontMissingModal',
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		fonts: {
			type: Array,
			default: () => []
		}
	},
	emits: ['close', 'download', 'ignore']
}
</script>
