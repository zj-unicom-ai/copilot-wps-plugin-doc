<template>
	<div class="radio-group">
		<div
			v-for="(option, index) in options"
			:key="index"
			class="radio-option"
			:class="{
				selected: modelValue === option.value,
				disabled: option.disabled
			}"
			@click="!option.disabled && selectOption(option.value)"
		>
			<div class="radio-dot"></div>
			<div class="radio-label">{{ option.label }}</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'RadioGroup',
	props: {
		modelValue: {
			type: [String, Number, Boolean],
			default: ''
		},
		options: {
			type: Array,
			required: true,
			validator: (value) => {
				return value.every(
					(option) => typeof option === 'object' && 'label' in option && 'value' in option
				)
			}
		},
		inline: {
			type: Boolean,
			default: false
		}
	},
	emits: ['update:modelValue', 'change'],
	setup(props, { emit }) {
		const selectOption = (value) => {
			if (props.modelValue !== value) {
				emit('update:modelValue', value)
				emit('change', value)
			}
		}

		return {
			selectOption
		}
	}
}
</script>

<style scoped>
.radio-group {
	display: flex;
	gap: 16px;
}

.radio-option {
	display: flex;
	align-items: center;
	gap: 10px;
	cursor: pointer;
	transition: all 0.3s ease;
}

.radio-dot {
	width: 16px;
	height: 16px;
	border: 2px solid #cbd5e0;
	border-radius: 50%;
	position: relative;
	flex-shrink: 0;
	transition: all 0.3s ease;
}

.radio-option.selected .radio-dot {
	border-color: #e60027;
}

.radio-option.selected .radio-dot::after {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 8px;
	height: 8px;
	background: #e60027;
	border-radius: 50%;
}

.radio-label {
	font-size: 14px;
}
</style>
