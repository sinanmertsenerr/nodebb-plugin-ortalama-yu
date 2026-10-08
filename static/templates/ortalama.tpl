<!-- Stil dosyası burada, sayfayla birlikte gelir: alttaki bilgi bölümü sunucuda çizilir, ilk boyamada stilli olmalı.
     Betik ve bölüm listesi sayfa okunurken inmeye başlar (page.js ve uygulama aynı isteği kullanır, iki kez inmez) -->
<link rel="stylesheet" href="{css}" data-ortalama-yu="css">
<link rel="preload" href="{js}" as="script">
<link rel="preload" href="{index}" as="fetch" crossorigin="anonymous">
<div class="ort-yu-page">
	<h1 class="ort-visually-hidden">{{tx("ortalama-yu:heading")}}</h1>
	<!-- data-clarity-mask: forumdaki oturum kaydı aracı (Microsoft Clarity) öğrencinin notlarını göremez -->
	<div class="ort-yu-mount" id="ort-yu-root" data-clarity-mask="True" data-js="{js}" data-base="{dataBase}">
		<noscript>
			<div class="alert alert-warning m-3">{{tx("ortalama-yu:needs-js")}}</div>
		</noscript>
		<div class="ort-yu-loading" role="status" aria-live="polite">
			<span>{{tx("ortalama-yu:loading")}}</span>
		</div>
	</div>
	<!-- IMPORT partials/ortalama/info.tpl -->
</div>
