export var voiceProviderList: Array<{key: string, label: string, elements?: Array<any>,  tts_voice?: Array<any>,  tts_model?: Array<any>, stt_model?: Array<any>}> = [ 
    {
        key: 'twilio',
        label: "Twilio",
        tts_voice: [
            { language_code: 'arb',      language: 'Arabic',                voiceId: "Zeina",               name:"Zeina",       type: "standard",   gender: "female" },
            
            { language_code: 'ar-AE',    language: 'Arabic (Gulf)',         voiceId: "Hala-Neural",         name:"Hala",        type: "neural",     gender: "female" },
            { language_code: 'ar-AE',    language: 'Arabic (Gulf)',         voiceId: "Zayd-Neural",         name:"Zayd",        type: "neural",     gender: "male"   },
            
            { language_code: 'nl-BE',    language: 'Dutch (Belgian)',       voiceId: "Lisa-Neural",         name:"Lisa",        type: "neural",     gender: "female" },
            
            { language_code: 'ca-ES',    language: 'Catalan',               voiceId: "Arle-Neuralt",        name:"Arlet",       type: "neural",     gender: "female" },
            
            { language_code: 'cs-CZ',    language: 'Czech',                 voiceId: "Jitka-Neural",        name:"Jitka",       type: "neural",     gender: "female" },
            
            { language_code: 'yue-CN',   language: 'Chinese (Cantonese)',   voiceId: "Hiujin-Neural",       name:"Hiujin",      type: "neural",     gender: "female" },
            { language_code: 'cmn-CN',   language: 'Chinese (Mandarin)',    voiceId: "Zhiyu-Neural",        name:"Zhiyu",       type: "neural",     gender: "female" },
            { language_code: 'cmn-CN',   language: 'Chinese (Mandarin)',    voiceId: "Zhiyu",               name:"Zhiyu",       type: "standard",   gender: "female" },
            
            { language_code: 'da-DK',    language: 'Danish',                voiceId: "Naja",                name:"Naja",        type: "standard",   gender: "female" },
            { language_code: 'da-DK',    language: 'Danish',                voiceId: "Mads",                name:"Mads",        type: "standard",   gender: "male"   },
            { language_code: 'da-DK',    language: 'Danish',                voiceId: "Sofie-Neural",        name:"Sofie",       type: "neural",     gender: "male"   },
            
            { language_code: 'nl-NL',    language: 'Dutch',                 voiceId: "Laura-Neural",        name:"Laura",       type: "neural",     gender: "female" },
            { language_code: 'nl-NL',    language: 'Dutch',                 voiceId: "Lotte",               name:"Lotte",       type: "standard",   gender: "female" },
            { language_code: 'nl-NL',    language: 'Dutch',                 voiceId: "Ruben",               name:"Ruben",       type: "standard",   gender: "male"   },
            
            { language_code: 'en-AU',    language: 'English (Australian)',  voiceId: "Nicole",              name:"Nicole",      type: "standard",   gender: "female" },
            { language_code: 'en-AU',    language: 'English (Australian)',  voiceId: "Olivia-Neural",       name:"Olivia",      type: "neural",     gender: "female" },
            { language_code: 'en-AU',    language: 'English (Australian)',  voiceId: "Russell",             name:"Russell",     type: "standard",   gender: "male"   },
            
            { language_code: 'en-GB',    language: 'English (British)',     voiceId: 'Amy',                 name: 'Amy',        type: 'standard',   gender: 'female' },
            { language_code: 'en-GB',    language: 'English (British)',     voiceId: 'Amy-Generative',      name: 'Amy',        type: 'generative', gender: 'female' },
            { language_code: 'en-GB',    language: 'English (British)',     voiceId: 'Amy-Neural',          name: 'Amy',        type: 'neural',     gender: 'female' },
            { language_code: 'en-GB',   language: 'English (British)',      voiceId: 'Emma',                name: 'Emma',       type: 'standard',   gender: 'female' },
            { language_code: 'en-GB',   language: 'English (British)',      voiceId: 'Emma-Neural',         name: 'Emma',       type: 'neural',     gender: 'female' },
            { language_code: 'en-GB',   language: 'English (British)',      voiceId: 'Brian',               name: 'Brian',      type: 'standard',   gender: 'male'   },
            { language_code: 'en-GB',   language: 'English (British)',      voiceId: 'Brian-Neural',        name: 'Brian',      type: 'neural',     gender: 'male'   },
            { language_code: 'en-GB',   language: 'English (British)',      voiceId: 'Arthur-Neural',       name: 'Arthur',     type: 'neural',     gender: 'male'   },
            
            { language_code: 'en-IN',   language: 'English (Indian)',       voiceId: 'Aditi',               name: 'Aditi',      type: 'standard',   gender: 'female' },
            { language_code: 'en-IN',   language: 'English (Indian)',       voiceId: 'Raveena',             name: 'Raveena',    type: 'standard',   gender: 'female' },
            { language_code: 'en-IN',   language: 'English (Indian)',       voiceId: 'Kajal-Generative',    name: 'Kajal',      type: 'generative', gender: 'female' },
            { language_code: 'en-IN',   language: 'English (Indian)',       voiceId: 'Kajal-Neural',        name: 'Kajal',      type: 'neural',     gender: 'female' },
            
            { language_code: 'en-IE',   language: 'English (Ireland)',      voiceId: 'Niamh-Neural',        name: 'Niamh',      type: 'neural',     gender: 'female' },
            
            { language_code: 'en-NZ',   language: 'English (New Zealand)',  voiceId: 'Aria-Neural',         name: 'Aria',       type: 'neural',     gender: 'female' },
            
            { language_code: 'en-SG',   language: 'English (Singaporean)',  voiceId: 'Jasmine-Neural',      name: 'Jasmine',    type: 'neural',     gender: 'female' },
            
            { language_code: 'en-ZA',   language: 'English (South African)',voiceId: 'Ayanda-Generative',   name: 'Ayanda',     type: 'generative', gender: 'female' },
            { language_code: 'en-ZA',   language: 'English (South African)',voiceId: 'Ayanda-Neural',       name: 'Ayanda',     type: 'neural',     gender: 'female' },
            
            { language_code: 'en-US',   language: 'English (US)',           voiceId: 'Danielle-Generative', name: 'Danielle',   type: 'generative', gender: 'female' },
            { language_code: 'en-US',   language: 'English (US)',           voiceId: 'Danielle-Neural',     name: 'Danielle',   type: 'neural',     gender: 'female' },
            { language_code: 'en-US',   language: 'English (US)',           voiceId: 'Gregory-Neural',      name: 'Gregory',    type: 'neural',     gender: 'male' },
            { language_code: 'en-US',   language: 'English (US)',           voiceId: 'Ivy-Neural',          name: 'Ivy',        type: 'neural',     gender: 'female' },
            { language_code: 'en-US',   language: 'English (US)',           voiceId: 'Joanna-Generative',   name: 'Joanna',     type: 'generative', gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Joanna-Neural',       name: 'Joanna',     type: 'neural',     gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Joanna',              name: 'Joanna',     type: 'standard',   gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Kendra-Neural',       name: 'Kendra',     type: 'neural',     gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Kendra',              name: 'Kendra',     type: 'standard',   gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Kimberly-Neural',     name: 'Kimberly',   type: 'neural',     gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Kimberly',            name: 'Kimberly',   type: 'standard',   gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Salli-Neural',        name: 'Salli',      type: 'neural',     gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Salli',               name: 'Salli',      type: 'standard',   gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Joey-Neural',         name: 'Joey',       type: 'neural',     gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Joey',                name: 'Joey',       type: 'standard',   gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Justin-Neural',       name: 'Justin',     type: 'neural',     gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Kevin-Neural',        name: 'Kevin',      type: 'neural',     gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Kevin',               name: 'Kevin',      type: 'standard',   gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Matthew-Generative',  name: 'Matthew',    type: 'generative', gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Matthew',             name: 'Matthew',    type: 'standard',   gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Ruth-Generative',     name: 'Ruth',       type: 'generative', gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Ruth-Neural',         name: 'Ruth',       type: 'neural',     gender: 'female' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Stephen-Generative',  name: 'Stephen',    type: 'generative', gender: 'male' },
            { language_code: 'en-US',       language: 'English (US)',           voiceId: 'Stephen-Neural',      name: 'Stephen',    type: 'neural',     gender: 'male' },
            
            { language_code: 'en-GB-WLS',   language: 'English (Welsh)',        voiceId: 'Geraint',             name: 'Geraint',    type: 'standard',   gender: 'male' },
            
            { language_code: 'fi-FI',       language: 'Finnish',                voiceId: 'Suvi-Neural',         name: 'Suvi',       type: 'neural',     gender: 'female' },
            
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Celine',              name: 'Celine',     type: 'standard',   gender: 'female' },
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Lea-Generative',      name: 'Lea',        type: 'generative', gender: 'female' },
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Lea',                 name: 'Lea',        type: 'neural',     gender: 'female' },
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Lea-Neural',          name: 'Lea',        type: 'neural',     gender: 'female' },
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Mathieu',             name: 'Mathieu',    type: 'standard',   gender: 'male' },
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Remi-Generative',     name: 'Remi',       type: 'generative', gender: 'male' },
            { language_code: 'fr-FR',       language: 'French',                 voiceId: 'Remi-Neural',         name: 'Remi',       type: 'neural',     gender: 'male' },
            
            { language_code: 'fr-BE',       language: 'French (Belgian)',       voiceId: 'Isabelle-Neural',     name: 'Isabelle',   type: 'neural',     gender: 'female' },
            
            { language_code: 'fr-CA',       language: 'French (Canadian)',      voiceId: 'Chantal',             name: 'Chantal',    type: 'standard',   gender: 'female' },
            { language_code: 'fr-CA',       language: 'French (Canadian)',      voiceId: 'Gabrielle-Neural',    name: 'Gabrielle',  type: 'neural',     gender: 'female' },
            { language_code: 'fr-CA',       language: 'French (Canadian)',      voiceId: 'Liam-Neural',         name: 'Liam',       type: 'neural',     gender: 'male' },

            // German (Germany)
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Marlene',             name: 'Marlene',    type: 'standard',   gender: 'female' },
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Vicki-Generative',    name: 'Vicki',      type: 'generative', gender: 'female' },
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Vicki-Neural',        name: 'Vicki',      type: 'neural',     gender: 'female' },
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Vicki',               name: 'Vicki',      type: 'standard',   gender: 'female' },
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Hans',                name: 'Hans',       type: 'standard',   gender: 'male' },
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Daniel-Generative',   name: 'Daniel',     type: 'generative', gender: 'male' },
            { language_code: 'de-DE',       language: 'German',                 voiceId: 'Daniel-Neural',       name: 'Daniel',     type: 'neural',     gender: 'male' },

            // German (Austria)
            { language_code: 'de-AT',       language: 'German (Austria)',       voiceId: 'Hannah-Neural',       name: 'Hannah',     type: 'neural',     gender: 'female' },

            // Hindi
            { language_code: 'hi-IN',       language: 'Hindi',                  voiceId: 'Aditi',               name: 'Aditi',      type: 'standard',   gender: 'female' },
            { language_code: 'hi-IN',       language: 'Hindi',                  voiceId: 'Kajal-Neural',        name: 'Kajal',      type: 'neural',     gender: 'female' },

            // Icelandic
            { language_code: 'is-IS',       language: 'Icelandic',              voiceId: 'Dora',                name: 'Dóra',       type: 'standard',   gender: 'female' },
            { language_code: 'is-IS',       language: 'Icelandic',              voiceId: 'Karl',                name: 'Karl',       type: 'standard',   gender: 'male' },

            // Italian
            { language_code: 'it-IT',       language: 'Italian',                voiceId: 'Carla',               name: 'Carla',      type: 'standard',   gender: 'female' },
            { language_code: 'it-IT',       language: 'Italian',                voiceId: 'Bianca-Generative',   name: 'Bianca',     type: 'generative', gender: 'female' },
            { language_code: 'it-IT',       language: 'Italian',                voiceId: 'Bianca-Neural',       name: 'Bianca',     type: 'neural',     gender: 'female' },
            { language_code: 'it-IT',       language: 'Italian',                voiceId: 'Bianca',              name: 'Bianca',     type: 'standard',   gender: 'female' },
            { language_code: 'it-IT',       language: 'Italian',                voiceId: 'Giorgio',             name: 'Giorgio',    type: 'standard',   gender: 'male' },
            { language_code: 'it-IT',       language: 'Italian',                voiceId: 'Adriano-Neural',      name: 'Adriano',    type: 'neural',     gender: 'male' },

            // Japanese
            { language_code: 'ja-JP',       language: 'Japanese',               voiceId: 'Mizuki',              name: 'Mizuki',     type: 'standard',   gender: 'female' },
            { language_code: 'ja-JP',       language: 'Japanese',               voiceId: 'Takumi',              name: 'Takumi',     type: 'standard',   gender: 'male' },
            { language_code: 'ja-JP',       language: 'Japanese',               voiceId: 'Takumi-Neural',       name: 'Takumi',     type: 'neural',     gender: 'male' },
            { language_code: 'ja-JP',       language: 'Japanese',               voiceId: 'Kazuha-Neural',       name: 'Kazuha',     type: 'neural',     gender: 'female' },
            { language_code: 'ja-JP',       language: 'Japanese',               voiceId: 'Tomoko-Neural',       name: 'Tomoko',     type: 'neural',     gender: 'female' },

            // Korean
            { language_code: 'ko-KR',       language: 'Korean',                 voiceId: 'Seoyeon',             name: 'Seoyeon',    type: 'standard',   gender: 'female' },
            { language_code: 'ko-KR',       language: 'Korean',                 voiceId: 'Seoyeon-Neural',      name: 'Seoyeon',    type: 'neural',     gender: 'female' },
            { language_code: 'ko-KR',       language: 'Korean',                 voiceId: 'Jihye-Neural',        name: 'Jihye',      type: 'neural',     gender: 'female' },

            // Norwegian
            { language_code: 'nb-NO',       language: 'Norwegian',              voiceId: 'Liv',                 name: 'Liv',        type: 'standard',   gender: 'female' },
            { language_code: 'nb-NO',       language: 'Norwegian',              voiceId: 'Ida-Neural',          name: 'Ida',        type: 'neural',     gender: 'female' },

            // Polish
            { language_code: 'pl-PL',       language: 'Polish',                 voiceId: 'Ewa',                 name: 'Ewa',        type: 'standard',   gender: 'female' },
            { language_code: 'pl-PL',       language: 'Polish',                 voiceId: 'Jacek',               name: 'Jacek',      type: 'standard',   gender: 'male' },
            { language_code: 'pl-PL',       language: 'Polish',                 voiceId: 'Jan',                 name: 'Jan',        type: 'standard',   gender: 'male' },
            { language_code: 'pl-PL',       language: 'Polish',                 voiceId: 'Maja',                name: 'Maja',       type: 'standard',   gender: 'female' },
            { language_code: 'pl-PL',       language: 'Polish',                 voiceId: 'Ola-Neural',          name: 'Ola',        type: 'neural',     gender: 'female' },

            // Portuguese (Brazilian)
            { language_code: 'pt-BR',       language: 'Portuguese (Brazilian)', voiceId: 'Camila',              name: 'Camila',     type: 'standard',   gender: 'female' },
            { language_code: 'pt-BR',       language: 'Portuguese (Brazilian)', voiceId: 'Camila-Neural',       name: 'Camila',     type: 'neural',     gender: 'female' },
            { language_code: 'pt-BR',       language: 'Portuguese (Brazilian)', voiceId: 'Vitória',             name: 'Vitória',    type: 'standard',   gender: 'female' },
            { language_code: 'pt-BR',       language: 'Portuguese (Brazilian)', voiceId: 'Vitória-Neural',      name: 'Vitória',    type: 'neural',     gender: 'female' },
            { language_code: 'pt-BR',       language: 'Portuguese (Brazilian)', voiceId: 'Ricardo',             name: 'Ricardo',    type: 'standard',   gender: 'male' },
            { language_code: 'pt-BR',       language: 'Portuguese (Brazilian)', voiceId: 'Thiago-Neural',       name: 'Thiago',     type: 'neural',     gender: 'male' },

            // Portuguese (European)
            { language_code: 'pt-PT',       language: 'Portuguese (European)',  voiceId: 'Inês',                name: 'Inês',       type: 'standard',   gender: 'female' },
            { language_code: 'pt-PT',       language: 'Portuguese (European)',  voiceId: 'Inês-Neural',         name: 'Inês',       type: 'neural',     gender: 'female' },
            { language_code: 'pt-PT',       language: 'Portuguese (European)',  voiceId: 'Cristiano',           name: 'Cristiano',  type: 'standard',   gender: 'male' },

            // Romanian
            { language_code: 'ro-RO',       language: 'Romanian',               voiceId: 'Carmen',              name: 'Carmen',     type: 'standard',   gender: 'female' },

            // Russian
            { language_code: 'ru-RU',       language: 'Russian',                voiceId: 'Tatyana',             name: 'Tatyana',    type: 'standard',   gender: 'female' },
            { language_code: 'ru-RU',       language: 'Russian',                voiceId: 'Maxim',               name: 'Maxim',      type: 'standard',   gender: 'male' },

            // Spanish (Spain)
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Conchita',            name: 'Conchita',   type: 'standard',   gender: 'female' },
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Lucia-Generative',    name: 'Lucia',      type: 'generative', gender: 'female' },
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Lucia-Neural',        name: 'Lucia',      type: 'neural',     gender: 'female' },
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Lucia',               name: 'Lucia',      type: 'standard',   gender: 'female' },
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Enrique',             name: 'Enrique',    type: 'standard',   gender: 'male' },
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Sergio-Generative',   name: 'Sergio',     type: 'generative', gender: 'male' },
            { language_code: 'es-ES',       language: 'Spanish (Spain)',        voiceId: 'Sergio-Neural',       name: 'Sergio',     type: 'neural',     gender: 'male' },

            // Spanish (Mexican)
            { language_code: 'es-MX',       language: 'Spanish (Mexican)',      voiceId: 'Mia-Generative',      name: 'Mia',        type: 'generative', gender: 'female' },
            { language_code: 'es-MX',       language: 'Spanish (Mexican)',      voiceId: 'Mia-Neural',          name: 'Mia',        type: 'neural',     gender: 'female' },
            { language_code: 'es-MX',       language: 'Spanish (Mexican)',      voiceId: 'Mia',                 name: 'Mia',        type: 'neural',     gender: 'female' },
            { language_code: 'es-MX',       language: 'Spanish (Mexican)',      voiceId: 'Andrés-Generative',   name: 'Andrés',     type: 'generative', gender: 'male' },
            { language_code: 'es-MX',       language: 'Spanish (Mexican)',      voiceId: 'Andrés-Neural',       name: 'Andrés',     type: 'neural',     gender: 'male' },

            // Spanish (US)
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Lupe-Generative',     name: 'Lupe',       type: 'generative', gender: 'female' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Lupe-Neural',         name: 'Lupe',       type: 'neural',     gender: 'female' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Lupe',                name: 'Lupe',       type: 'standard',   gender: 'female' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Penélope',            name: 'Penélope',   type: 'standard',   ender: 'female' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Miguel',              name: 'Miguel',     type: 'standard',   gender: 'male' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Pedro-Generative',    name: 'Pedro',      type: 'generative', gender: 'male' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Pedro-Neural',        name: 'Pedro',      type: 'neural',     gender: 'male' },

            // Swedish
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Astrid',              name: 'Astrid',     type: 'standard',   gender: 'female' },
            { language_code: 'sv-SE',       language: 'Swedish',                voiceId: 'Elin-Neural',         name: 'Elin',       type: 'neural',     gender: 'male' },

            // Turkish
            { language_code: 'tr-TR',       language: 'Turkish',                voiceId: 'Filiz',               name: 'Filiz',      type: 'standard',   gender: 'female' },
            { language_code: 'tr-TR',       language: 'Turkish',                voiceId: 'Burcu',               name: 'Burcu',      type: 'neural',     gender: 'female' },

            // Welsh
            { language_code: 'cy-GB',       language: 'Welsh',                  voiceId: 'Gwyneth',             name: 'Gwyneth',    type: 'standard',   gender: 'female' }

            //{ language_code: 'arb',      language: 'Arabic',               voices: [ { voiceId: "Zeina", name:"Zeina", type: "standard", gender: "female" }, ] },
        ]
    },
    {
        key: 'openai',
        label: "OpenAi",
        tts_voice: [
            { voiceId: 'alloy',         name: 'Alloy',      type: 'standard', status: 'active' },
            { voiceId: 'ash',           name: 'Ash',        type: 'standard', status: 'active' },
            { voiceId: 'ballad',        name: 'Ballad',     type: 'standard', status: 'active'},
            { voiceId: 'coral',         name: 'Coral',      type: 'standard', status: 'active' },
            { voiceId: 'echo',          name: 'Echo',       type: 'standard', status: 'active' },
            { voiceId: 'fable',         name: 'Fable',      type: 'standard', status: 'active' },
            { voiceId: 'onyx',          name: 'Onyx',       type: 'standard', status: 'active' },
            { voiceId: 'nova',          name: 'Nova',       type: 'standard', status: 'active' },
            { voiceId: 'sage',          name: 'Sage',       type: 'standard', status: 'active' },
            { voiceId: 'shimmer',       name: 'Shimmer',    type: 'standard', status: 'active' },
            { voiceId: 'verse',         name: 'Verse',      type: 'standard', status: 'active' }
        ],
        tts_model: [
            { model: 'tts-1',                       name: 'tts-1',                      status: 'active' },
            { model: 'tts-1-hd',                    name: 'tts-1-hd',                   status: 'active' },
            { model: 'gpt-4o-mini-tts',             name: 'gpt-4o-mini-tts',            status: 'active' },
        ],
        stt_model: [
            { model: 'gpt-4o-transcribe',           name: 'gpt-4o-transcribe',          status: 'active' },
            { model: 'gpt-4o-mini-transcribe',      name: 'gpt-4o-mini-transcribe',     status: 'active' },
            { model: 'whisper-1',                   name: 'whisper-1',                  status: 'active' },
        ]
    },
]