<!-- Herkesin gördüğü bilgi bölümü: sunucuda çizilir, arama motorları da okur. Sayılar data/not-sistemi.json ile
     aynıdır (test/info.test.js ikisini karşılaştırır); kurallar alttaki resmi belgelerden, madde madde doğrulandı. -->
<section class="ort-info" aria-labelledby="ort-info-title">
	<h2 class="ort-info-title" id="ort-info-title">Yaşar Üniversitesi'nde not ortalaması nasıl hesaplanır?</h2>
	<p class="ort-info-lead">Dönem not ortalaması (DNO) ve genel not ortalaması (GNO) AKTS ağırlıklıdır: her dersin harf notunun katsayısı o dersin AKTS'siyle çarpılır, çarpımlar toplanır ve toplam AKTS'ye bölünür.</p>

	<div class="ort-info-grid">
		<div class="ort-info-block">
			<h3 class="ort-rule">Harf notları ve katsayıları</h3>
			<table class="ort-table ort-table--grades">
				<caption class="ort-visually-hidden">Harf notları, katsayıları ve puan aralıkları</caption>
				<thead>
					<tr><th scope="col">Harf notu</th><th scope="col" class="ort-num">Katsayı</th><th scope="col" class="ort-num">Puan aralığı</th></tr>
				</thead>
				<tbody>
					<tr><th scope="row">A</th><td class="ort-num">4,00</td><td class="ort-num">95–100</td></tr>
					<tr><th scope="row">A-</th><td class="ort-num">3,70</td><td class="ort-num">90–94</td></tr>
					<tr><th scope="row">B+</th><td class="ort-num">3,30</td><td class="ort-num">85–89</td></tr>
					<tr><th scope="row">B</th><td class="ort-num">3,00</td><td class="ort-num">80–84</td></tr>
					<tr><th scope="row">B-</th><td class="ort-num">2,70</td><td class="ort-num">75–79</td></tr>
					<tr><th scope="row">C+</th><td class="ort-num">2,30</td><td class="ort-num">70–74</td></tr>
					<tr><th scope="row">C</th><td class="ort-num">2,00</td><td class="ort-num">65–69</td></tr>
					<tr><th scope="row">C-</th><td class="ort-num">1,70</td><td class="ort-num">60–64</td></tr>
					<tr><th scope="row">D+</th><td class="ort-num">1,30</td><td class="ort-num">55–59</td></tr>
					<tr><th scope="row">D</th><td class="ort-num">1,00</td><td class="ort-num">50–54</td></tr>
					<tr><th scope="row">F</th><td class="ort-num">0,00</td><td class="ort-num">0–49</td></tr>
				</tbody>
			</table>
			<p class="ort-info-note">Puan aralıkları üniversitenin Uygulama Esasları'ndaki karşılıklardır. Harf notunu dersin öğretim elemanı verir.</p>
		</div>

		<div class="ort-info-block">
			<h3 class="ort-rule">Örnek hesap</h3>
			<table class="ort-table">
				<caption class="ort-visually-hidden">Üç dersli bir dönemin not ortalaması</caption>
				<thead>
					<tr><th scope="col">Ders</th><th scope="col" class="ort-num">AKTS</th><th scope="col">Not</th><th scope="col" class="ort-num">Katsayı × AKTS</th></tr>
				</thead>
				<tbody>
					<tr><th scope="row">Matematik</th><td class="ort-num">5</td><td>A</td><td class="ort-num">4,00 × 5 = 20,00</td></tr>
					<tr><th scope="row">Programlama</th><td class="ort-num">6</td><td>B-</td><td class="ort-num">2,70 × 6 = 16,20</td></tr>
					<tr><th scope="row">Akademik İngilizce</th><td class="ort-num">4</td><td>C+</td><td class="ort-num">2,30 × 4 = 9,20</td></tr>
				</tbody>
				<tfoot>
					<tr><th scope="row">Toplam</th><td class="ort-num">15</td><td></td><td class="ort-num">45,40</td></tr>
				</tfoot>
			</table>
			<p class="ort-info-result">45,40 ÷ 15 = 3,0266… Dönem ortalaması <b>3,02</b> olur: üçüncü basamak atılır, 3,03'e yuvarlanmaz.</p>

			<h3 class="ort-rule">Ortalamaya girmeyen notlar</h3>
			<p class="ort-info-text">S (yeterli), U (yetersiz), W (çekilme), I (eksik), T (transfer) ve P (devam) ortalamaya girmez. NA (devamsız), ortalamaya giren derste F gibi 0,00 sayılır.</p>
		</div>
	</div>

	<div class="ort-info-grid">
		<div class="ort-info-block">
			<h3 class="ort-rule">Ortalamayı etkileyen kurallar</h3>
			<dl class="ort-facts">
				<div><dt>Yuvarlama</dt><dd>Ortalama yuvarlanmaz. Virgülden sonraki üçüncü basamak atılır: 2,999 çıkan ortalama 2,99 yazılır.</dd></div>
				<div><dt>Tekrar alınan ders</dt><dd>Genel ortalamaya en son alınan not girer, önceki nottan düşük olsa bile.</dd></div>
				<div><dt>Geçme notu</dt><dd>Ortalamaya giren derste en az D gerekir. C-, D+ ya da D alınan ders, notu yükseltmek için yeniden alınabilir.</dd></div>
				<div><dt>Başarısız ders</dt><dd>F, U, W ya da NA alınan zorunlu ders, açıldığı ilk dönemde yeniden alınır.</dd></div>
				<div><dt>Dersten çekilme</dt><dd>Öğrenim boyunca lisansta en çok dört, ön lisansta en çok iki dersten çekilinebilir.</dd></div>
				<div><dt>Yaz okulu</dt><dd>Yaz öğretiminde alınan dersler, izleyen güz yarıyılının başında genel ortalamaya katılır.</dd></div>
			</dl>
		</div>

		<div class="ort-info-block">
			<h3 class="ort-rule">Hangi ortalama ne için gerekir?</h3>
			<table class="ort-table ort-table--marks">
				<caption class="ort-visually-hidden">Genel not ortalaması eşikleri</caption>
				<thead>
					<tr><th scope="col">Genel ortalama</th><th scope="col">Ne için gerekir</th></tr>
				</thead>
				<tbody>
					<tr><th scope="row">2,00</th><td>Mezuniyet ve YU-COOP başvurusu (ön lisans). Genel ortalaması 1,99 ve altında olan öğrenci sınamalı sayılır; dönemde en çok 32 AKTS alabilir.</td></tr>
					<tr><th scope="row">2,30</th><td>Yan dal programına devam.</td></tr>
					<tr><th scope="row">2,50</th><td>Yan dal başvurusu, YU-COOP başvurusu (lisans) ve çift anadala devam. Çift anadalda her akademik yılın sonunda en az 2,50 aranır; ikinci kez altına düşen öğrencinin çift anadal kaydı silinir.</td></tr>
					<tr><th scope="row">2,72</th><td>Çift anadal programından mezuniyet (çift anadalın kendi ortalaması).</td></tr>
					<tr><th scope="row">3,00</th><td>Çift anadal başvurusu, akademik başarı bursu değerlendirmesi ve mezuniyet derecesi (bölümde ilk üç). Çift anadal için ayrıca sınıfında ilk %20'de olmak ya da hedef programın taban puanını sağlamak gerekir.</td></tr>
				</tbody>
			</table>
			<p class="ort-info-note">Başarılı ve sınamalı statüleri, programa yeni başlayan öğrenciye ikinci dönemin sonundan itibaren uygulanır.</p>
		</div>
	</div>

	<p class="ort-info-src">Kaynak: <a href="https://www.mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=22754&amp;mevzuatTur=UniversiteYonetmeligi&amp;mevzuatTertip=5" target="_blank" rel="noopener">Ön Lisans ve Lisans Eğitim-Öğretim ve Sınav Yönetmeliği</a>, <a href="https://www.yasar.edu.tr/yu-files/uygulama-esaslari/tr/%C3%96n%20Lisans%20ve%20Lisans%20Y%C3%B6netmeli%C4%9Fi%20Uygulama%20Esaslar%C4%B1.pdf" target="_blank" rel="noopener">Uygulama Esasları</a>, <a href="https://www.yasar.edu.tr/yu-files/yonetmelik-yonerge/tr/17142681426985499401.pdf" target="_blank" rel="noopener">Çift Anadal ve Yan Dal Yönergesi</a>, <a href="https://www.yasar.edu.tr/wp-content/uploads/2024/08/On-Lisans-ve-Lisans-Egitim-Ogretim-Burs-ve-Indirim-Yonergesi.pdf" target="_blank" rel="noopener">Burs ve İndirim Yönergesi</a>, <a href="https://www.yasar.edu.tr/wp-content/uploads/2025/02/YU-COOP-Yonergesi.pdf" target="_blank" rel="noopener">YU-COOP Yönergesi</a>, <a href="https://www.yasar.edu.tr/yu-files/yonetmelik-yonerge/tr/22036861048077078428.pdf" target="_blank" rel="noopener">Yaz Öğretimi Yönetmeliği</a> ve <a href="https://www.yasar.edu.tr/yu-files/uygulama-esaslari/tr/Mezuniyet%20T%C3%B6reni%20D%C3%BCzenleme%20Usul%20ve%20Esaslar%C4%B1-31052022.pdf" target="_blank" rel="noopener">Mezuniyet Töreni Usul ve Esasları</a>. Bilgiler 8 Ekim 2026'da derlendi. Bu sayfa üniversitenin resmi sayfası değildir; kesin bilgi için Öğrenci İşleri Müdürlüğü'ne danış.</p>
</section>
