# Fontes

Alegreya Sans (400 e 700) e Cinzel (700), as duas sob a SIL Open Font License 1.1 (textos
completos em `LICENSE-alegreya-sans.txt` e `LICENSE-cinzel.txt`; nenhuma das duas reserva nome).

Os arquivos são recortes dos que o Fontsource distribui (`@fontsource/alegreya-sans` e
`@fontsource/cinzel` 5.x, subconjunto "latin"), feitos com o `pyftsubset` do fontTools:

```sh
pyftsubset ORIGEM.woff2 --flavor=woff2 --output-file=DESTINO.woff2 \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2039-203A,U+20AC,U+2122,U+2192,U+2212" \
  --no-hinting --desubroutinize --name-IDs='*' --name-languages='*' \
  --layout-features='kern,liga,lnum,tnum,onum,pnum,case,ccmp,locl,mark,mkmk'
```

- Sem "hinting" (instruções para telas antigas de baixa resolução): é o que mais pesa no arquivo,
  e as telas de hoje desenham bem sem ele.
- Os nomes e os avisos de direitos autorais e de licença continuam dentro de cada arquivo.
- O `unicode-range` do `@font-face` (src/styles/index.css) repete a lista acima: se mudar uma,
  mude a outra.
