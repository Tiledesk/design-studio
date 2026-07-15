# JSON Condition — grammatica e valutazione della stringa `when`

> Documento di riferimento da inserire nel **system prompt** del chatbot/runtime. Descrive ogni
> condizione che il Design Studio può produrre, il formato esatto con cui le condizioni vengono
> passate (la stringa `when`) e come il modello DEVE valutarle.
>
> Regola fondamentale: **non sollevare mai errori**. Riconduci entrambi i lati al tipo implicato
> dall'operatore, valuta, e restituisci esattamente `true` o `false`. Se un valore manca o non è
> coercibile, la condizione atomica vale `false`.

---

## 1. Formato generale

Una condizione viene passata come un'unica stringa booleana chiamata `when`. Esempio:

```
(test_1.text == "23") && (ai_reply.name == 11)
```

- Le **condizioni atomiche** sono combinate con `&&` (AND) e `||` (OR).
- Precedenza standard: **`&&` lega più di `||`** (`A && B || C` ≡ `(A && B) || C`).
- I gruppi dell'autore sono racchiusi tra parentesi per preservare il raggruppamento: `(A && B) || (C && D)`.
- Le condizioni incomplete vengono omesse in fase di costruzione, quindi la stringa non contiene mai `&&`/`||` penzolanti.

### Operandi

- **Operando sinistro** = l'attributo da verificare. Sempre un **path nudo** (senza apici, senza `{{ }}`):
  `test_1.text`, `ai_reply.name`, `kb_json_sources[0].name`, `user.age`.
- **Operando destro** = uno tra:
  - **Letterale stringa** → tra doppi apici, con `\` e `"` con escape: `"hello"`, `"a \"b\""`.
  - **Letterale numerico** → nudo: `11`, `3.14`, `-2`.
  - **Letterale booleano** → nudo `true` / `false` (prodotto solo da `is true` / `is false`).
  - **Letterale data** → stringa ISO-8601 tra doppi apici: `"2026-06-15"`, `"2026-06-15T10:00:00Z"`.
  - **Riferimento a variabile** → un identificatore nudo che NON è un numero/booleano: `otherAttr`, `user.city`.
    Va risolto come un altro attributo e se ne confrontano i valori.

> Disambiguazione di un operando destro **nudo**: se è parsabile come numero → letterale numerico;
> se è `true`/`false` → letterale booleano; altrimenti → riferimento a variabile (da risolvere).

### Algoritmo di valutazione

1. Analizza la stringa `when` nelle condizioni atomiche unite da `&&`/`||` con le parentesi.
2. Per ogni condizione atomica: risolvi il valore dell'attributo sinistro e il valore destro,
   **riconduci entrambi al tipo dell'operatore** (vedi §3), valuta, ottieni `true`/`false`.
   In caso di qualsiasi fallimento → `false`.
3. Combina i risultati atomici con `&&`, `||` e parentesi (precedenza come sopra). Restituisci `true`/`false`.

Tutti i confronti su stringa sono **case-sensitive**.

---

## 2. Catalogo completo delle condizioni (38 operatori)

`x` = path dell'attributo sinistro · `"y"` = stringa tra apici · `N` = numero nudo · ISO = data ISO tra apici.
Le negazioni sono emesse come `!fn(...)`.

### Esistenza / generici (unari — nessun operando destro)
| Operatore | Forma `when` | Significato |
|---|---|---|
| exists | `!isUndefined(x)` | l'attributo è definito (presente), anche se null/vuoto |
| does not exist | `isUndefined(x)` | l'attributo è undefined / non presente |
| is empty | `isEmpty(x)` | stringa vuota, array vuoto, oggetto vuoto, o null/undefined |
| is not empty | `!isEmpty(x)` | non vuoto |
| is null | `isNull(x)` | il valore è esattamente `null` |
| is undefined | `isUndefined(x)` | il valore è esattamente `undefined` |

### Testo (coercion a stringa, case-sensitive)
| Operatore | Forma `when` | Esempio |
|---|---|---|
| is equal to (text) | `x == "y"` | `user.city == "Roma"` |
| is not equal to (text) | `x != "y"` | `user.city != "Roma"` |
| contains | `contains(x, "y")` | `contains(msg.text, "hi")` |
| does not contain | `!contains(x, "y")` | `!contains(msg.text, "hi")` |
| starts with | `startsWith(x, "y")` | `startsWith(lang, "it")` |
| does not start with | `!startsWith(x, "y")` | `!startsWith(lang, "it")` |
| ends with | `endsWith(x, "y")` | `endsWith(file, ".pdf")` |
| does not end with | `!endsWith(x, "y")` | `!endsWith(file, ".pdf")` |
| matches regex | `matches(x, "y")` | `matches(email, "^.+@.+$")` |
| does not match regex | `!matches(x, "y")` | `!matches(email, "^.+@.+$")` |

### Numero (coercion a numero — operando destro nudo)
| Operatore | Forma `when` | Esempio |
|---|---|---|
| is equal to (number) | `x == N` | `ai_reply.name == 11` |
| is not equal to (number) | `x != N` | `count != 0` |
| is greater than | `x > N` | `age > 18` |
| is greater than or equal to | `x >= N` | `age >= 18` |
| is less than | `x < N` | `score < 100` |
| is less than or equal to | `x <= N` | `score <= 100` |

### Booleano (unari)
| Operatore | Forma `when` | Significato |
|---|---|---|
| is true | `x == true` | il valore si riconduce a booleano true |
| is false | `x == false` | il valore si riconduce a booleano false |

### Data e ora (coercion a data — operando destro = stringa ISO tra apici)
| Operatore | Forma `when` | Esempio |
|---|---|---|
| is equal to (date) | `dateEqual(x, "y")` | `dateEqual(createdAt, "2026-06-15")` |
| is not equal to (date) | `!dateEqual(x, "y")` | `!dateEqual(createdAt, "2026-06-15")` |
| is after | `isAfter(x, "y")` | `isAfter(createdAt, "2026-01-01")` |
| is before | `isBefore(x, "y")` | `isBefore(createdAt, "2026-01-01")` |
| is after or equal to | `isAfterOrEqual(x, "y")` | `isAfterOrEqual(createdAt, "2026-01-01")` |
| is before or equal to | `isBeforeOrEqual(x, "y")` | `isBeforeOrEqual(createdAt, "2026-01-01")` |

### Array
| Operatore | Forma `when` | Significato |
|---|---|---|
| contains (array) | `arrayContains(x, "y")` | l'array contiene l'elemento `"y"` |
| does not contain (array) | `!arrayContains(x, "y")` | l'array non contiene `"y"` |
| length equal to | `length(x) == N` | lunghezza array/stringa == N |
| length not equal to | `length(x) != N` | lunghezza != N |
| length greater than | `length(x) > N` | lunghezza > N |
| length less than | `length(x) < N` | lunghezza < N |
| length greater than or equal to | `length(x) >= N` | lunghezza >= N |
| length less than or equal to | `length(x) <= N` | lunghezza <= N |

---

## 3. Regole di coercion (come "modificare la funzione" in base al tipo di dato)

Il nome dell'operatore porta con sé il tipo previsto. **Riconduci entrambi gli operandi a quel tipo,
poi valuta.** Non sollevare mai errori; in caso di fallimento di coercion restituisci `false`.

- **Testo** (`==`/`!=` text, `contains`, `startsWith`, `endsWith`, `matches`): riconduci entrambi i lati
  a stringa. Confronto **case-sensitive**. `matches(x, "re")` = test regex di `x` con il pattern `re`.
- **Numero** (`==`/`!=` number, `>`, `>=`, `<`, `<=`, e tutti i `length(...)`): riconduci entrambi i lati
  a numero. Se uno dei due è `NaN` → `false`.
- **Booleano** (`x == true` / `x == false`): riconduci il sinistro a booleano. Considera `true`/`"true"`
  come vero e `false`/`"false"` come falso (case-insensitive solo per questi due letterali); qualsiasi
  altra cosa → `false`.
- **Data** (`dateEqual`, `isAfter`, `isBefore`, `isAfterOrEqual`, `isBeforeOrEqual`): parse di entrambi
  come date (ISO-8601). Confronto cronologico (`dateEqual` = stesso istante). Data non valida → `false`.
- **Array** (`arrayContains`, `length`): riconduci il sinistro ad array (se è una stringa JSON, fai il
  parse). `arrayContains` = test di appartenenza (confronto elementi come stringa). `length(x)` = numero
  di elementi dell'array; se `x` è una stringa, la sua lunghezza in caratteri; altrimenti `0`.
- **Esistenza/Vuoto**: `isUndefined` = valore `undefined`; `isNull` = valore `null`;
  `exists` = NON undefined; `isEmpty` = `null`/`undefined`/`""`/`[]`/`{}`; `isNotEmpty` = la negazione.
- **Negazione** `!fn(...)`: NOT logico del risultato booleano della funzione.

### La differenza di tipo non è mai un errore
Confrontare valori di tipo diverso NON deve fallire. Riconduci secondo l'operatore e restituisci
`true`/`false`. Esempio: `ai_reply.name == 11` con `ai_reply.name = "11"` → coercion a numero →
`11 == 11` → `true`.

---

## 4. Esempio guidato

```
(test_1.text == "23") && (ai_reply.name == 11)
```
- `test_1.text == "23"` → uguaglianza testo: confronta `String(test_1.text)` con `"23"` (case-sensitive).
- `ai_reply.name == 11` → uguaglianza numero: confronta `Number(ai_reply.name)` con `11`.
- Risultato = AND delle due. Qualsiasi lato non risolto/non coercibile ⇒ quella condizione atomica è `false`.

---

## 5. Note
- Tutti i confronti sono **case-sensitive** (gli operatori legacy `*IgnoreCase` sono stati rimossi;
  se compaiono in dati vecchi, vanno trattati come l'equivalente case-sensitive).
- L'operando sinistro è sempre un path di attributo nudo; non è mai racchiuso in `{{ }}`.
- L'operando destro può essere a sua volta un attributo (identificatore nudo) → risolvilo e confronta i valori.
