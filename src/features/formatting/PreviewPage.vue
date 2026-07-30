<template>
	<div class="preview-page">
		<div class="header">
			<div class="back-button" @click="goBack">
				<img src="/icons/chat/attachment/left.svg" alt="返回" class="back-icon" />
				<div class="back-text">返回</div>
			</div>
		</div>
		<div class="content">
			<!-- <div v-if="title" class="title">{{ title }}</div> -->
			<div class="image-container">
				<img :src="imageUrl" alt="Preview" class="preview-image" />
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const title = ref('')
const imageUrl = ref('')

onMounted(() => {
	title.value = route.query.title || ''
	imageUrl.value = route.query.imageUrl || ''
})

const goBack = () => {
	router.back()
}
</script>

<style scoped>
.preview-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f5f5f5;
}

.header {
	margin: 15px;
}

.back-button {
	display: flex;
	align-items: center;
	cursor: pointer;
	color: #333;
	font-size: 16px;
	font-weight: 500;
}

.back-text {
	font-size: 16px;
}

.back-icon {
	width: 20px;
	height: 20px;
	margin-right: 8px;
}

.content {
	flex: 1;
	overflow-y: auto;
	padding: 10px 15px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.title {
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 20px;
	color: #333;
}

.image-container {
	max-width: 100%;
	background: #fff;
	padding: 10px;
	border-radius: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-image {
	max-width: 100%;
	height: auto;
	display: block;
}
</style>
