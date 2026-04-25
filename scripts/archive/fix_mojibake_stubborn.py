"""One-shot fix for the 3 stubborn mojibake entries that could not be round-tripped.
Runs clean manual retranslations into dictionary_entries_multilang for troas/trophimus/tyre PT."""
import duckdb

con = duckdb.connect('data/analytics/bible.duckdb')

TROAS_SMITH_PT = (
    "a cidade de onde Paulo navegou pela primeira vez, em consequência de uma indicação divina, "
    "para levar o evangelho da Ásia à Europa. (At 16.8,11) É mencionada em outras ocasiões. "
    "(At 20.5,6; 2Co 2.12,13; 2Tm 4.13) Seu nome completo era Alexandria Trôade (Lív. xxxv. 42), "
    "e às vezes era chamada simplesmente Alexandria, às vezes simplesmente Trôade. Foi construída "
    "primeiramente por Antígono sob o nome de Antigonéia Trôade, e povoada com os habitantes de "
    "algumas cidades vizinhas. Depois foi embelezada por Lisímaco, e chamada Alexandria Trôade. "
    "Sua situação era na costa da Mísia, em frente à extremidade sudeste da ilha de Tênedo. "
    "Sob os romanos, foi uma das cidades mais importantes da província da Ásia. No tempo de Paulo "
    "era uma *colonia* com o *Jus Italicum*. O nome moderno é Eski-Stamboul, com ruínas "
    "consideráveis. Ainda é possível traçar o porto numa bacia de cerca de 400 pés de comprimento "
    "e 200 de largura."
)

TROPHIMUS_SMITH_PT = (
    "(nutritivo). Tanto Trófimo como Tíquico acompanharam Paulo desde a Macedônia até a Ásia, "
    "mas Tíquico parece ter permanecido ali, enquanto Trófimo prosseguiu com o apóstolo até "
    "Jerusalém. (d.C. 54.) Ali foi a causa inocente do tumulto em que Paulo foi preso. "
    "(At 21.27-29) Desta passagem aprendemos dois fatos novos, a saber: que Trófimo era gentio, "
    "e que era natural de... Trófimo provavelmente foi um dos irmãos que, com Tito, levou a "
    "segunda Epístola aos Coríntios. (2Co 8.16-24) [Tíquico]"
)

TYRE_EASTON_PT = (
    'Uma rocha, hoje es-Sur; antiga cidade fenícia, cerca de 37 km, em linha reta, ao norte de '
    'Acre, e 32 km ao sul de Sidom. Sidom era a mais antiga cidade fenícia, mas Tiro teve uma '
    'história mais longa e ilustre. O comércio do mundo inteiro se reunia nos armazéns de Tiro. '
    '"Os mercadores tírios foram os primeiros que se aventuraram a navegar pelas águas do '
    'Mediterrâneo; e fundaram suas colônias nas costas e ilhas vizinhas do mar Egeu, na Grécia, '
    'na costa norte da África, em Cartago e outros lugares, na Sicília e na Córsega, na Espanha '
    'em Tartesso, e até mesmo além das colunas de Hércules em Gadeira (Cádiz)" (Isaiah, de '
    'Driver). No tempo de Davi, foi feita uma aliança amistosa entre os hebreus e os tírios, que '
    'durante muito tempo foram governados por seus reis nativos (2Sm 5.11; 1Rs 5.1; 2Cr 2.3). '
    'Tiro consistia em duas partes distintas: uma fortaleza rochosa em terra firme, chamada '
    '"Tiro Velha," e a cidade, construída numa pequena ilha rochosa cerca de 800 metros da costa. '
    'Era lugar de grande força. Foi sitiada por Salmaneser, auxiliado pelos fenícios do '
    'continente, por cinco anos, e por Nabucodonosor (a.C. 586-573) por treze anos, aparentemente '
    'sem êxito. Posteriormente caiu sob o poder de Alexandre, o Grande, após cerco de sete meses, '
    'mas continuou a manter muito de sua importância comercial até a era cristã. É referida em '
    'Mt 11.21 e At 12.20. Em d.C. 1291 foi tomada pelos sarracenos, e desde então permaneceu em '
    'desolada ruína. "A tinta púrpura de Tiro tinha celebridade mundial pela durabilidade de seus '
    'belos tons, e sua manufatura era fonte de abundante riqueza para os habitantes daquela '
    'cidade." Tanto Tiro como Sidom "estavam apinhadas de lojas de vidro, tinturarias e oficinas '
    'de tecelagem; e, entre seus hábeis artesãos, não era a menos importante a classe dos que se '
    'celebravam pelo entalhe de pedras preciosas." (2Cr 2.7, 14). A iniquidade e a idolatria '
    'desta cidade são frequentemente denunciadas pelos profetas, e sua destruição final predita '
    '(Is 23.1; Jr 25.22; Ez 26; 28.1-19; Am 1.9, 10; Zc 9.2-4). Aqui se fundou uma igreja logo '
    'após a morte de Estêvão, e Paulo, ao regressar de sua terceira viagem missionária, passou '
    'uma semana em comunhão com os discípulos ali (At 21.4). Aqui se repetiu a cena de Mileto ao '
    'deixá-los. Todos, com suas esposas e filhos, o acompanharam até a praia. A viagem marítima '
    'do apóstolo terminou em Ptolemaida, cerca de 61 km de Tiro. Dali prosseguiu para Cesareia '
    '(At 21.5-8). "É notada em monumentos tão antigos quanto a.C. 1500, e reivindica, segundo '
    'Heródoto, ter sido fundada por volta de a.C. 2700. Tinha dois portos ainda existentes, e '
    'foi de importância comercial em todas as épocas, com colônias em Cartago (por volta de '
    'a.C. 850) e por todo o Mediterrâneo. Foi frequentemente atacada pelo Egito e pela Assíria, '
    'e tomada por Alexandre, o Grande, após terrível cerco em a.C. 332. Hoje é uma cidade de '
    '3.000 habitantes, com túmulos antigos e uma catedral arruinada. Um curto texto fenício do '
    'quarto século a.C. é o único monumento até agora recuperado."'
)

TYRE_SMITH_PT = (
    "(uma rocha), célebre cidade comercial da Fenícia, na costa do Mediterrâneo. Seu nome "
    "hebraico, *Tzor*, significa rocha; o que bem concorda com o sítio de Sur, a cidade moderna, "
    "numa península rochosa, outrora uma ilha. Não há dúvida de que, antes do cerco da cidade "
    "por Alexandre, o Grande, Tiro estava situada numa ilha; mas, segundo a tradição dos "
    "habitantes, havia uma cidade no continente antes que houvesse uma cidade na ilha; e a "
    "tradição recebe certa cor do nome de Paletiro, ou Tiro Velha, que levava, em tempos gregos, "
    "uma cidade no continente, trinta estádios ao sul. Notícias na Bíblia. — Na Bíblia, Tiro é "
    'nomeada pela primeira vez em Josué, cap. (Js 19.29), onde é referida como cidade fortificada '
    '(na Versão Autorizada, "a cidade forte"), em referência aos limites da tribo de Aser. Mas '
    "as primeiras passagens nos escritos históricos hebraicos, ou na história antiga em geral, "
    "que oferecem vislumbres reais da condição de Tiro, estão no livro de Samuel, (2Sm 5.11), em "
    "conexão com Hirão, rei de Tiro, enviando madeira de cedro e operários a Davi, para "
    "edificar-lhe um palácio; e subsequentemente no livro dos Reis, em conexão com a construção "
    "do templo de Salomão. É evidente que, sob Salomão, havia estreita aliança entre os hebreus "
    "e os tírios. Hirão forneceu a Salomão madeira de cedro, metais preciosos e operários, e "
    "deu-lhe marinheiros para a viagem a Ofir e à Índia, enquanto, por outro lado, Salomão deu a "
    "Hirão provisões de trigo e azeite, cedeu-lhe algumas cidades, e permitiu-lhe usar alguns "
    "portos no Mar Vermelho. (1Rs 9.11-14; 26-28; 10.22) Essas relações amistosas sobreviveram "
    "por algum tempo à desastrosa secessão das dez tribos, e um século depois Acabe se casou com "
    "uma filha de Etbaal, rei dos sidônios, (1Rs 16.31), que, segundo Menandro, era filha de "
    "Itobal, rei de Tiro. Quando a cobiça mercantil induziu os tírios e os fenícios vizinhos a "
    "comprar cativos hebreus de seus inimigos e vendê-los como escravos aos gregos e edomitas, "
    "começaram denúncias e, primeiro, ameaças de retaliação. (Jl 3.4-8; Am 1.9,10) Quando "
    "Salmaneser, rei da Assíria, tomou a cidade de Samaria, conquistou o reino de Israel e levou "
    "seus habitantes ao cativeiro, sitiou Tiro, que, contudo, resistiu-lhe com sucesso. É em "
    "referência a este cerco que a profecia contra Tiro em Isaías, (Is 23.1)..., foi proferida. "
    "Após o cerco de Tiro por Salmaneser (que deve ter ocorrido não muito depois de 721 a.C.), "
    "Tiro permaneceu como poderoso estado, com seus próprios reis, (Jr 25.22; 27.3; Ez 28.2-12), "
    "notável por sua riqueza, com território no continente, e protegida por fortes fortificações. "
    "(Ez 26.4,6,8,10,12; 27.11; 28.5; Zc 9.3) Nosso conhecimento de sua condição dali em diante, "
    "até o cerco por Nabucodonosor, depende inteiramente de várias notícias dela pelos profetas "
    "hebreus; mas algumas dessas notícias são singularmente completas, e, em especial, o "
    "capítulo vinte e sete de Ezequiel nos fornece, em alguns pontos, detalhes como raramente "
    "nos chegaram a respeito de qualquer cidade da antiguidade, exceto Roma e Atenas. Cerco por "
    "Nabucodonosor. — Em meio a grande prosperidade e riqueza, que era resultado natural de "
    "extenso comércio, (Ez 28.4), Nabucodonosor, à frente de um exército dos caldeus, invadiu a "
    "Judeia e capturou Jerusalém. Como Tiro ficava tão perto de Jerusalém, e como os "
    "conquistadores eram raça feroz e formidável, (Hc 1.6), seria natural supor que este evento "
    "teria provocado alarme e terror entre os tírios. Em vez disso, podemos inferir da "
    "declaração de Ezequiel, (Ez 26.2), que seu sentimento predominante era de exultação. À "
    "primeira vista isso parece estranho e quase inconcebível; mas torna-se inteligível por "
    "alguns eventos anteriores na história judaica. Apenas 34 anos antes de começar a destruição "
    "de Jerusalém, ocorreu a célebre reforma de Josias, a.C. 622. Essa momentosa revolução "
    "religiosa, (2Rs 22.1; 2Rs 23.1)..., explica plenamente a exultação e a malevolência dos "
    "tírios. Nessa reforma, Josias acumulou insultos sobre os deuses que eram objeto de "
    "veneração e amor dos tírios. Na verdade, parecia ter-se empenhado em exterminar sua "
    "religião. (2Rs 23.20) Esses atos devem ter sido considerados pelos tírios como uma série "
    "de ultrajes sacrílegos e abomináveis; e dificilmente podemos duvidar de que a morte em "
    "batalha de Josias em Megido, e a subsequente destruição da cidade e do templo de Jerusalém, "
    "foram saudadas por eles com triunfo, como exemplos de retribuição divina nos assuntos "
    "humanos. Essa alegria, porém, deve logo ter dado lugar a outros sentimentos quando "
    "Nabucodonosor invadiu a Fenícia e sitiou Tiro. Esse cerco durou treze anos, e é ainda "
    "ponto disputado se Tiro foi realmente tomada por Nabucodonosor o"
)

con.execute("UPDATE dictionary_entries_multilang SET text_smith=? WHERE slug='troas' AND lang='pt'", [TROAS_SMITH_PT])
con.execute("UPDATE dictionary_entries_multilang SET text_smith=? WHERE slug='trophimus' AND lang='pt'", [TROPHIMUS_SMITH_PT])
con.execute("UPDATE dictionary_entries_multilang SET text_easton=? WHERE slug='tyre' AND lang='pt'", [TYRE_EASTON_PT])
con.execute("UPDATE dictionary_entries_multilang SET text_smith=? WHERE slug='tyre' AND lang='pt'", [TYRE_SMITH_PT])
con.commit()

# Verify
for n in ('opus-marathon-turn-086', 'opus-marathon-turn-087'):
    total = con.execute("SELECT COUNT(*) FROM dictionary_entries_multilang WHERE notes=?", [n]).fetchone()[0]
    bad = con.execute(
        "SELECT COUNT(*) FROM dictionary_entries_multilang WHERE notes=? "
        "AND (text_easton LIKE '%Ã©%' OR text_easton LIKE '%Ã­%' OR text_easton LIKE '%Ã³%' "
        "OR text_easton LIKE '%Ã´%' OR text_easton LIKE '%Ãª%' OR text_easton LIKE '%Ã‰%' "
        "OR text_smith LIKE '%Ã©%' OR text_smith LIKE '%Ã­%' OR text_smith LIKE '%Ã³%' "
        "OR text_smith LIKE '%Ã´%' OR text_smith LIKE '%Ãª%')",
        [n],
    ).fetchone()[0]
    print(f'{n}: total={total}, residual_mojibake={bad}')

for slug in ('troas', 'trophimus', 'tyre'):
    row = con.execute(
        "SELECT text_easton, text_smith FROM dictionary_entries_multilang WHERE slug=? AND lang='pt'", [slug]
    ).fetchone()
    e, sm = row
    print(f'{slug}.easton: {(e or "")[:80]}')
    print(f'{slug}.smith : {(sm or "")[:80]}')
con.close()
