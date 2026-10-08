<!-- Dosyalar ve bölüm listesi sayfa okunurken hemen inmeye başlar (page.js ve uygulama aynı isteği kullanır, iki kez inmez) -->
<link rel="preload" href="{js}" as="script">
<link rel="preload" href="{css}" as="style">
<link rel="preload" href="{index}" as="fetch" crossorigin="anonymous">
<!-- data-clarity-mask: forumdaki oturum kaydı aracı (Microsoft Clarity) öğrencinin notlarını göremez -->
<div class="ort-yu-page" id="ort-yu-root" data-clarity-mask="True" data-js="{js}" data-css="{css}" data-base="{dataBase}">
	<noscript>
		<div class="alert alert-warning m-3">{{tx("ortalama-yu:needs-js")}}</div>
	</noscript>
	<div class="ort-yu-loading" role="status" aria-live="polite">
		<span>{{tx("ortalama-yu:loading")}}</span>
	</div>
</div>
