/**
 * File attachment helpers for the chat task pane.
 * Upload is currently disabled; helpers remain for history/UI.
 */

export function getFileIcon(fileType) {
	const type = (fileType || '').toLowerCase()

	if (type.startsWith('image/')) {
		if (type.includes('jpeg') || type.includes('jpg')) return './icons/chat/attachment/jpg.svg'
		if (type.includes('png')) return './icons/chat/attachment/png.svg'
		if (type.includes('bmp')) return './icons/chat/attachment/bmp.svg'
		return './icons/chat/attachment/image.svg'
	}

	if (
		type.includes('excel') ||
		type.includes('spreadsheet') ||
		type.includes('xls') ||
		type.includes('vnd.ms-excel') ||
		type.includes('vnd.openxmlformats-officedocument.spreadsheet')
	) {
		return './icons/chat/attachment/excel.svg'
	}

	if (
		type.includes('msword') ||
		type.includes('wordprocessing') ||
		type.includes('vnd.openxmlformats-officedocument.wordprocessing')
	) {
		return './icons/chat/attachment/word.svg'
	}

	if (
		type.includes('powerpoint') ||
		type.includes('presentation') ||
		type.includes('vnd.openxmlformats-officedocument.presentation')
	) {
		return './icons/chat/attachment/ppt.svg'
	}

	if (type.includes('pdf')) return './icons/chat/attachment/pdf.svg'
	if (type.includes('audio')) return './icons/chat/attachment/mp3.svg'
	if (type.includes('video')) return './icons/chat/attachment/mp4.svg'
	if (type.includes('text') || type.includes('txt')) return './icons/chat/attachment/txt.svg'
	if (type.includes('markdown') || type.includes('md')) return './icons/chat/attachment/md.svg'
	if (type.includes('javascript') || type.includes('js')) return './icons/chat/attachment/js.svg'
	if (type.includes('java')) return './icons/chat/attachment/java.svg'
	if (type.includes('python') || type.includes('py')) return './icons/chat/attachment/py.svg'
	if (type.includes('cpp') || type.includes('c++')) return './icons/chat/attachment/cpp.svg'

	if (
		type.includes('document') ||
		type.includes('officedocument') ||
		type.includes('application')
	) {
		return './icons/chat/attachment/file.svg'
	}

	return './icons/chat/attachment/word.svg'
}

export function formatFileSize(bytes) {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
