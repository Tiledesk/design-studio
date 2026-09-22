export var voiceProviderList: Array<{key: string, label: string, elements?: Array<any>,  tts_voice?: Array<any>,  tts_model?: Array<any>, stt_model?: Array<any>}> = [ 
    {
        key: 'twilio',
        label: "Twilio",
        tts_voice: [
            // Afrikaans (South Africa)
            { language_code: 'af-ZA', language: 'Afrikaans (South Africa)', voiceId: 'Google.af-ZA-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Amharic (Ethiopia)
            { language_code: 'am-ET', language: 'Amharic (Ethiopia)', voiceId: 'Google.am-ET-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Arabic (Gulf)
            { language_code: 'ar-AE', language: 'Arabic (Gulf)', voiceId: 'Polly..Hala-Neural', name: 'Hala', type: 'neural', gender: 'female' },
            { language_code: 'ar-AE', language: 'Arabic (Gulf)', voiceId: 'Polly.Zayd-Neural', name: 'Zayd', type: 'neural', gender: 'male' },

            // Arabic
            { language_code: 'ar-XA', language: 'Arabic', voiceId: 'Google.ar-XA-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Arabic
            { language_code: 'arb', language: 'Arabic', voiceId: 'Polly.Zeina', name: 'Zeina', type: 'standard', gender: 'female' },

            // Bulgarian (Bulgaria)
            { language_code: 'bg-BG', language: 'Bulgarian (Bulgaria)', voiceId: 'Google.bg-BG-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Bengali (India)
            { language_code: 'bn-IN', language: 'Bengali (India)', voiceId: 'Google.bn-IN-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },

            // Catalan
            { language_code: 'ca-ES', language: 'Catalan', voiceId: 'Polly.Arle-Neuralt', name: 'Arlet', type: 'neural', gender: 'female' },
            { language_code: 'ca-ES', language: 'Catalan', voiceId: 'Google.ca-ES-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Chinese (Mandarin)
            { language_code: 'cmn-CN', language: 'Mandarin Chinese', voiceId: 'Google.cmn-CN-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },
            { language_code: 'cmn-CN', language: 'Chinese (Mandarin)', voiceId: 'Polly.Zhiyu', name: 'Zhiyu', type: 'standard', gender: 'female' },
            { language_code: 'cmn-CN', language: 'Chinese (Mandarin)', voiceId: 'Polly.Zhiyu-Neural', name: 'Zhiyu', type: 'neural', gender: 'female' },

            // Mandarin Chinese (Taiwan)
            { language_code: 'cmn-TW', language: 'Mandarin Chinese (Taiwan)', voiceId: 'Google.cmn-TW-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Czech
            { language_code: 'cs-CZ', language: 'Czech', voiceId: 'Polly.Jitka-Neural', name: 'Jitka', type: 'neural', gender: 'female' },
            { language_code: 'cs-CZ', language: 'Czech (Czech Republic)', voiceId: 'Google.cs-CZ-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Welsh
            { language_code: 'cy-GB', language: 'Welsh', voiceId: 'Polly.Gwyneth', name: 'Gwyneth', type: 'standard', gender: 'female' },

            // Danish
            { language_code: 'da-DK', language: 'Danish', voiceId: 'Polly.Mads', name: 'Mads', type: 'standard', gender: 'male' },
            { language_code: 'da-DK', language: 'Danish', voiceId: 'Polly.Naja', name: 'Naja', type: 'standard', gender: 'female' },
            { language_code: 'da-DK', language: 'Danish', voiceId: 'Polly.Sofie-Neural', name: 'Sofie', type: 'neural', gender: 'male' },
            { language_code: 'da-DK', language: 'Danish', voiceId: 'Google.da-DK-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },

            // German (Austria)
            { language_code: 'de-AT', language: 'German (Austria)', voiceId: 'Polly.Hannah-Neural', name: 'Hannah', type: 'neural', gender: 'female' },

            // German
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Daniel-Generative', name: 'Daniel', type: 'generative', gender: 'male' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Daniel-Neural', name: 'Daniel', type: 'neural', gender: 'male' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Hans', name: 'Hans', type: 'standard', gender: 'male' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Marlene', name: 'Marlene', type: 'standard', gender: 'female' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Google.de-DE-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Vicki', name: 'Vicki', type: 'standard', gender: 'female' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Vicki-Generative', name: 'Vicki', type: 'generative', gender: 'female' },
            { language_code: 'de-DE', language: 'German', voiceId: 'Polly.Vicki-Neural', name: 'Vicki', type: 'neural', gender: 'female' },

            // Greek (Greece)
            { language_code: 'el-GR', language: 'Greek (Greece)', voiceId: 'Google.el-GR-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // English (Australian)
            { language_code: 'en-AU', language: 'English (Australian)', voiceId: 'Polly.Nicole', name: 'Nicole', type: 'standard', gender: 'female' },
            { language_code: 'en-AU', language: 'English (Australian)', voiceId: 'Polly.Olivia-Neural', name: 'Olivia', type: 'neural', gender: 'female' },
            { language_code: 'en-AU', language: 'English (Australian)', voiceId: 'Polly.Russell', name: 'Russell', type: 'standard', gender: 'male' },
            { language_code: 'en-AU', language: 'English (Australian)', voiceId: 'Google.en-AU-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // English (Canada)
            { language_code: 'en-CA', language: 'English (Canada)', voiceId: 'alice', name: 'Alice', type: 'standard', gender: 'female' },

            // English (British)
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Amy', name: 'Amy', type: 'standard', gender: 'female' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Amy-Generative', name: 'Amy', type: 'generative', gender: 'female' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Amy-Neural', name: 'Amy', type: 'neural', gender: 'female' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Arthur-Neural', name: 'Arthur', type: 'neural', gender: 'male' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Brian', name: 'Brian', type: 'standard', gender: 'male' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Brian-Neural', name: 'Brian', type: 'neural', gender: 'male' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Emma', name: 'Emma', type: 'standard', gender: 'female' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Polly.Emma-Neural', name: 'Emma', type: 'neural', gender: 'female' },
            { language_code: 'en-GB', language: 'English (British)', voiceId: 'Google.en-GB-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // English (Welsh)
            { language_code: 'en-GB-WLS', language: 'English (Welsh)', voiceId: 'Polly.Geraint', name: 'Geraint', type: 'standard', gender: 'male' },

            // English (Ireland)
            { language_code: 'en-IE', language: 'English (Ireland)', voiceId: 'Polly.Niamh-Neural', name: 'Niamh', type: 'neural', gender: 'female' },

            // English (Indian)
            { language_code: 'en-IN', language: 'English (Indian)', voiceId: 'Polly.Aditi', name: 'Aditi', type: 'standard', gender: 'female' },
            { language_code: 'en-IN', language: 'English (Indian)', voiceId: 'Polly.Kajal-Generative', name: 'Kajal', type: 'generative', gender: 'female' },
            { language_code: 'en-IN', language: 'English (Indian)', voiceId: 'Polly.Kajal-Neural', name: 'Kajal', type: 'neural', gender: 'female' },
            { language_code: 'en-IN', language: 'English (Indian)', voiceId: 'Polly.Raveena', name: 'Raveena', type: 'standard', gender: 'female' },
            { language_code: 'en-IN', language: 'English (Indian)', voiceId: 'Google.en-IN-Standard-D', name: 'Standard D', type: 'standard', gender: 'unknown' },

            // English (New Zealand)
            { language_code: 'en-NZ', language: 'English (New Zealand)', voiceId: 'Polly.Aria-Neural', name: 'Aria', type: 'neural', gender: 'female' },

            // English (Singaporean)
            { language_code: 'en-SG', language: 'English (Singaporean)', voiceId: 'Polly.Jasmine-Neural', name: 'Jasmine', type: 'neural', gender: 'female' },

            // English (US)
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Danielle-Generative', name: 'Danielle', type: 'generative', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Danielle-Neural', name: 'Danielle', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Gregory-Neural', name: 'Gregory', type: 'neural', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Ivy-Neural', name: 'Ivy', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'JPolly.oanna-Generative', name: 'Joanna', type: 'generative', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Joanna', name: 'Joanna', type: 'standard', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Joanna-Neural', name: 'Joanna', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Joey', name: 'Joey', type: 'standard', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Joey-Neural', name: 'Joey', type: 'neural', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Justin-Neural', name: 'Justin', type: 'neural', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Kendra', name: 'Kendra', type: 'standard', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Kendra-Neural', name: 'Kendra', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Kevin', name: 'Kevin', type: 'standard', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Kevin-Neural', name: 'Kevin', type: 'neural', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Kimberly', name: 'Kimberly', type: 'standard', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Kimberly-Neural', name: 'Kimberly', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Matthew', name: 'Matthew', type: 'standard', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Matthew-Generative', name: 'Matthew', type: 'generative', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Ruth-Generative', name: 'Ruth', type: 'generative', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Ruth-Neural', name: 'Ruth', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Salli', name: 'Salli', type: 'standard', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Salli-Neural', name: 'Salli', type: 'neural', gender: 'female' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Google.en-US-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Stephen-Generative', name: 'Stephen', type: 'generative', gender: 'male' },
            { language_code: 'en-US', language: 'English (US)', voiceId: 'Polly.Stephen-Neural', name: 'Stephen', type: 'neural', gender: 'male' },

            // English (South African)
            { language_code: 'en-ZA', language: 'English (South African)', voiceId: 'Polly.Ayanda-Generative', name: 'Ayanda', type: 'generative', gender: 'female' },
            { language_code: 'en-ZA', language: 'English (South African)', voiceId: 'Polly.Ayanda-Neural', name: 'Ayanda', type: 'neural', gender: 'female' },

            // Spanish (Spain)
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Conchita', name: 'Conchita', type: 'standard', gender: 'female' },
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Enrique', name: 'Enrique', type: 'standard', gender: 'male' },
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Lucia', name: 'Lucia', type: 'standard', gender: 'female' },
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Lucia-Generative', name: 'Lucia', type: 'generative', gender: 'female' },
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Lucia-Neural', name: 'Lucia', type: 'neural', gender: 'female' },
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Sergio-Generative', name: 'Sergio', type: 'generative', gender: 'male' },
            { language_code: 'es-ES', language: 'Spanish (Spain)', voiceId: 'Polly.Sergio-Neural', name: 'Sergio', type: 'neural', gender: 'male' },
            { language_code: 'es-ES', language: 'Spanish (Castilian)', voiceId: 'Google.es-ES-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },

            // Spanish (Mexican)
            { language_code: 'es-MX', language: 'Spanish (Mexican)', voiceId: 'Polly.Andrés-Generative', name: 'Andrés', type: 'generative', gender: 'male' },
            { language_code: 'es-MX', language: 'Spanish (Mexican)', voiceId: 'Polly.Andrés-Neural', name: 'Andrés', type: 'neural', gender: 'male' },
            { language_code: 'es-MX', language: 'Spanish (Mexican)', voiceId: 'Polly.Mia', name: 'Mia', type: 'neural', gender: 'female' },
            { language_code: 'es-MX', language: 'Spanish (Mexican)', voiceId: 'Polly.Mia-Generative', name: 'Mia', type: 'generative', gender: 'female' },
            { language_code: 'es-MX', language: 'Spanish (Mexican)', voiceId: 'Polly.Mia-Neural', name: 'Mia', type: 'neural', gender: 'female' },

            // Spanish (Latin American)
            { language_code: 'es-US', language: 'Spanish (Latin American)', voiceId: 'Google.es-US-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Basque (Spain)
            { language_code: 'eu-ES', language: 'Basque (Spain)', voiceId: 'Google.eu-ES-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Finnish
            { language_code: 'fi-FI', language: 'Finnish', voiceId: 'Google.fi-FI-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },
            { language_code: 'fi-FI', language: 'Finnish', voiceId: 'Polly.Suvi-Neural', name: 'Suvi', type: 'neural', gender: 'female' },

            // Filipino (Philippines)
            { language_code: 'fil-PH', language: 'Filipino (Philippines)', voiceId: 'Google.fil-PH-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // French (Belgian)
            { language_code: 'fr-BE', language: 'French (Belgian)', voiceId: 'Polly.Isabelle-Neural', name: 'Isabelle', type: 'neural', gender: 'female' },

            // French (Canadian)
            { language_code: 'fr-CA', language: 'French (Canadian)', voiceId: 'Polly.Chantal', name: 'Chantal', type: 'standard', gender: 'female' },
            { language_code: 'fr-CA', language: 'French (Canadian)', voiceId: 'Polly.Gabrielle-Neural', name: 'Gabrielle', type: 'neural', gender: 'female' },
            { language_code: 'fr-CA', language: 'French (Canadian)', voiceId: 'Polly.Liam-Neural', name: 'Liam', type: 'neural', gender: 'male' },
            { language_code: 'fr-CA', language: 'French (Canadian)', voiceId: 'Google.fr-CA-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // French
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Celine', name: 'Celine', type: 'standard', gender: 'female' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Lea', name: 'Lea', type: 'neural', gender: 'female' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Lea-Generative', name: 'Lea', type: 'generative', gender: 'female' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Lea-Neural', name: 'Lea', type: 'neural', gender: 'female' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Mathieu', name: 'Mathieu', type: 'standard', gender: 'male' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Remi-Generative', name: 'Remi', type: 'generative', gender: 'male' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Polly.Remi-Neural', name: 'Remi', type: 'neural', gender: 'male' },
            { language_code: 'fr-FR', language: 'French', voiceId: 'Google.fr-FR-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Galician (Spain)
            { language_code: 'gl-ES', language: 'Galician (Spain)', voiceId: 'Google.gl-ES-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Gujarati (India)
            { language_code: 'gu-IN', language: 'Gujarati (India)', voiceId: 'Google.gu-IN-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Hebrew (Israel)
            { language_code: 'he-IL', language: 'Hebrew (Israel)', voiceId: 'Google.he-IL-Standard-D', name: 'Standard D', type: 'standard', gender: 'unknown' },

            // Hindi
            { language_code: 'hi-IN', language: 'Hindi', voiceId: 'Polly.Aditi', name: 'Aditi', type: 'standard', gender: 'female' },
            { language_code: 'hi-IN', language: 'Hindi', voiceId: 'Polly.Kajal-Neural', name: 'Kajal', type: 'neural', gender: 'female' },
            { language_code: 'hi-IN', language: 'Hindi', voiceId: 'Google.hi-IN-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Hungarian (Hungary)
            { language_code: 'hu-HU', language: 'Hungarian (Hungary)', voiceId: 'Google.hu-HU-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Indonesian (Indonesia)
            { language_code: 'id-ID', language: 'Indonesian (Indonesia)', voiceId: 'Google.id-ID-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Icelandic
            { language_code: 'is-IS', language: 'Icelandic', voiceId: 'Polly.Dora', name: 'Dóra', type: 'standard', gender: 'female' },
            { language_code: 'is-IS', language: 'Icelandic', voiceId: 'Polly.Karl', name: 'Karl', type: 'standard', gender: 'male' },
            { language_code: 'is-IS', language: 'Icelandic', voiceId: 'Google.is-IS-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Italian
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Polly.Adriano-Neural', name: 'Adriano', type: 'neural', gender: 'male' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Polly.Bianca', name: 'Bianca', type: 'standard', gender: 'female' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Polly.Bianca-Generative', name: 'Bianca', type: 'generative', gender: 'female' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Polly.Bianca-Neural', name: 'Bianca', type: 'neural', gender: 'female' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Polly.Carla', name: 'Carla', type: 'standard', gender: 'female' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Polly.Giorgio', name: 'Giorgio', type: 'standard', gender: 'male' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Aoede', name: 'Chirp3-HD-Aoede', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Charon', name: 'Chirp3-HD-Charon', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Fenrir', name: 'Chirp3-HD-Fenrir', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Kore', name: 'Chirp3-HD-Kore', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Leda', name: 'Chirp3-HD-Leda', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Orus', name: 'Chirp3-HD-Orus', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Puck', name: 'Chirp3-HD-Puck', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Chirp3-HD-Zephyr', name: 'Chirp3-HD-Zephyr', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Neural2-A', name: 'Neural2-A', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Neural2-C', name: 'Neural2-C', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Neural2-F', name: 'Neural2-F', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Wavenet-A', name: 'Wavenet A', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Wavenet-B', name: 'Wavenet B', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Wavenet-C', name: 'Wavenet C', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Wavenet-D', name: 'Wavenet D', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Wavenet-E', name: 'Wavenet E', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Wavenet-F', name: 'Wavenet F', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Standard-B', name: 'Standard B', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Standard-D', name: 'Standard D', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Standard-E', name: 'Standard E', type: 'standard', gender: 'unknown' },
            { language_code: 'it-IT', language: 'Italian', voiceId: 'Google.it-IT-Standard-F', name: 'Standard F', type: 'standard', gender: 'unknown' },
            
            // Japanese
            { language_code: 'ja-JP', language: 'Japanese', voiceId: 'Polly.Kazuha-Neural', name: 'Kazuha', type: 'neural', gender: 'female' },
            { language_code: 'ja-JP', language: 'Japanese', voiceId: 'Polly.Mizuki', name: 'Mizuki', type: 'standard', gender: 'female' },
            { language_code: 'ja-JP', language: 'Japanese', voiceId: 'Google.ja-JP-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },
            { language_code: 'ja-JP', language: 'Japanese', voiceId: 'Polly.Takumi', name: 'Takumi', type: 'standard', gender: 'male' },
            { language_code: 'ja-JP', language: 'Japanese', voiceId: 'Polly.Takumi-Neural', name: 'Takumi', type: 'neural', gender: 'male' },
            { language_code: 'ja-JP', language: 'Japanese', voiceId: 'Polly.Tomoko-Neural', name: 'Tomoko', type: 'neural', gender: 'female' },

            // Kannada (India)
            { language_code: 'kn-IN', language: 'Kannada (India)', voiceId: 'Google.kn-IN-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },

            // Korean
            { language_code: 'ko-KR', language: 'Korean', voiceId: 'Polly.Jihye-Neural', name: 'Jihye', type: 'neural', gender: 'female' },
            { language_code: 'ko-KR', language: 'Korean', voiceId: 'Polly.Seoyeon', name: 'Seoyeon', type: 'standard', gender: 'female' },
            { language_code: 'ko-KR', language: 'Korean', voiceId: 'Polly.Seoyeon-Neural', name: 'Seoyeon', type: 'neural', gender: 'female' },
            { language_code: 'ko-KR', language: 'Korean', voiceId: 'Google.ko-KR-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Lithuanian (Lithuania)
            { language_code: 'lt-LT', language: 'Lithuanian (Lithuania)', voiceId: 'Google.lt-LT-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Latvian (Latvia)
            { language_code: 'lv-LV', language: 'Latvian (Latvia)', voiceId: 'Google.lv-LV-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Malayalam (India)
            { language_code: 'ml-IN', language: 'Malayalam (India)', voiceId: 'Google.ml-IN-Wavenet-C', name: 'Wavenet C', type: 'neural', gender: 'unknown' },

            // Marathi (India)
            { language_code: 'mr-IN', language: 'Marathi (India)', voiceId: 'Google.mr-IN-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Malay (Malaysia)
            { language_code: 'ms-MY', language: 'Malay (Malaysia)', voiceId: 'Google.ms-MY-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Norwegian
            { language_code: 'nb-NO', language: 'Norwegian', voiceId: 'Polly.Ida-Neural', name: 'Ida', type: 'neural', gender: 'female' },
            { language_code: 'nb-NO', language: 'Norwegian', voiceId: 'Polly.Liv', name: 'Liv', type: 'standard', gender: 'female' },
            { language_code: 'nb-NO', language: 'Norwegian', voiceId: 'Google.nb-NO-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Dutch (Belgian)
            { language_code: 'nl-BE', language: 'Dutch (Belgian)', voiceId: 'Polly.Lisa-Neural', name: 'Lisa', type: 'neural', gender: 'female' },
            { language_code: 'nl-BE', language: 'Dutch (Belgium)', voiceId: 'Google.nl-BE-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Dutch
            { language_code: 'nl-NL', language: 'Dutch', voiceId: 'Polly.Laura-Neural', name: 'Laura', type: 'neural', gender: 'female' },
            { language_code: 'nl-NL', language: 'Dutch', voiceId: 'Polly.Lotte', name: 'Lotte', type: 'standard', gender: 'female' },
            { language_code: 'nl-NL', language: 'Dutch', voiceId: 'Polly.Ruben', name: 'Ruben', type: 'standard', gender: 'male' },
            { language_code: 'nl-NL', language: 'Dutch', voiceId: 'Google.nl-NL-Standard-B', name: 'Standard B', type: 'standard', gender: 'unknown' },

            // Punjabi (India)
            { language_code: 'pa-IN', language: 'Punjabi (India)', voiceId: 'Google.pa-IN-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Polish
            { language_code: 'pl-PL', language: 'Polish', voiceId: 'Polly.Ewa', name: 'Ewa', type: 'standard', gender: 'female' },
            { language_code: 'pl-PL', language: 'Polish', voiceId: 'Polly.Jacek', name: 'Jacek', type: 'standard', gender: 'male' },
            { language_code: 'pl-PL', language: 'Polish', voiceId: 'Polly.Jan', name: 'Jan', type: 'standard', gender: 'male' },
            { language_code: 'pl-PL', language: 'Polish', voiceId: 'Polly.Maja', name: 'Maja', type: 'standard', gender: 'female' },
            { language_code: 'pl-PL', language: 'Polish', voiceId: 'Polly.Ola-Neural', name: 'Ola', type: 'neural', gender: 'female' },
            { language_code: 'pl-PL', language: 'Polish', voiceId: 'Google.pl-PL-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Portuguese (Brazilian)
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Polly.Camila', name: 'Camila', type: 'standard', gender: 'female' },
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Polly.Camila-Neural', name: 'Camila', type: 'neural', gender: 'female' },
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Polly.Ricardo', name: 'Ricardo', type: 'standard', gender: 'male' },
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Google.pt-BR-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Polly.Thiago-Neural', name: 'Thiago', type: 'neural', gender: 'male' },
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Polly.Vitória', name: 'Vitória', type: 'standard', gender: 'female' },
            { language_code: 'pt-BR', language: 'Portuguese (Brazilian)', voiceId: 'Polly.Vitória-Neural', name: 'Vitória', type: 'neural', gender: 'female' },

            // Portuguese (European)
            { language_code: 'pt-PT', language: 'Portuguese (European)', voiceId: 'Polly.Cristiano', name: 'Cristiano', type: 'standard', gender: 'male' },
            { language_code: 'pt-PT', language: 'Portuguese (European)', voiceId: 'Polly.Inês', name: 'Inês', type: 'standard', gender: 'female' },
            { language_code: 'pt-PT', language: 'Portuguese (European)', voiceId: 'Polly.Inês-Neural', name: 'Inês', type: 'neural', gender: 'female' },
            { language_code: 'pt-PT', language: 'Portuguese (European)', voiceId: 'Google.pt-PT-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Romanian
            { language_code: 'ro-RO', language: 'Romanian', voiceId: 'Polly.Carmen', name: 'Carmen', type: 'standard', gender: 'female' },
            { language_code: 'ro-RO', language: 'Romanian', voiceId: 'Google.ro-RO-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Russian
            { language_code: 'ru-RU', language: 'Russian', voiceId: 'Polly.Maxim', name: 'Maxim', type: 'standard', gender: 'male' },
            { language_code: 'ru-RU', language: 'Russian', voiceId: 'Google.ru-RU-Standard-E', name: 'Standard E', type: 'standard', gender: 'unknown' },
            { language_code: 'ru-RU', language: 'Russian', voiceId: 'Polly.Tatyana', name: 'Tatyana', type: 'standard', gender: 'female' },

            // Slovak (Slovakia)
            { language_code: 'sk-SK', language: 'Slovak (Slovakia)', voiceId: 'Google.sk-SK-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Serbian (Cyrillic)
            { language_code: 'sr-RS', language: 'Serbian (Cyrillic)', voiceId: 'Google.sr-RS-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Swedish
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Astrid', name: 'Astrid', type: 'standard', gender: 'female' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Elin-Neural', name: 'Elin', type: 'neural', gender: 'male' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Lupe', name: 'Lupe', type: 'standard', gender: 'female' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Lupe-Generative', name: 'Lupe', type: 'generative', gender: 'female' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Lupe-Neural', name: 'Lupe', type: 'neural', gender: 'female' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Miguel', name: 'Miguel', type: 'standard', gender: 'male' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Pedro-Generative', name: 'Pedro', type: 'generative', gender: 'male' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Pedro-Neural', name: 'Pedro', type: 'neural', gender: 'male' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Polly.Penélope', name: 'Penélope', type: 'standard', gender: 'female' },
            { language_code: 'sv-SE', language: 'Swedish', voiceId: 'Google.sv-SE-Standard-B', name: 'Standard B', type: 'standard', gender: 'unknown' },

            // Tamil (India)
            { language_code: 'ta-IN', language: 'Tamil (India)', voiceId: 'Google.ta-IN-Standard-C', name: 'Standard C', type: 'standard', gender: 'unknown' },

            // Telugu (India)
            { language_code: 'te-IN', language: 'Telugu (India)', voiceId: 'Google.te-IN-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Thai (Thailand)
            { language_code: 'th-TH', language: 'Thai (Thailand)', voiceId: 'Google.th-TH-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Turkish
            { language_code: 'tr-TR', language: 'Turkish', voiceId: 'Polly.Burcu', name: 'Burcu', type: 'neural', gender: 'female' },
            { language_code: 'tr-TR', language: 'Turkish', voiceId: 'Polly.Filiz', name: 'Filiz', type: 'standard', gender: 'female' },
            { language_code: 'tr-TR', language: 'Turkish', voiceId: 'Google.tr-TR-Standard-B', name: 'Standard B', type: 'standard', gender: 'unknown' },

            // Ukrainian (Ukraine)
            { language_code: 'uk-UA', language: 'Ukrainian (Ukraine)', voiceId: 'Google.uk-UA-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Vietnamese (Vietnam)
            { language_code: 'vi-VN', language: 'Vietnamese (Vietnam)', voiceId: 'Google.vi-VN-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Chinese (Cantonese)
            { language_code: 'yue-CN', language: 'Chinese (Cantonese)', voiceId: 'Polly.Hiujin-Neural', name: 'Hiujin', type: 'neural', gender: 'female' },

            // Chinese (Hong Kong)
            { language_code: 'yue-HK', language: 'Chinese (Hong Kong)', voiceId: 'Google.yue-HK-Standard-A', name: 'Standard A', type: 'standard', gender: 'unknown' },

            // Chinese (Mandarin)
            { language_code: 'zh-CN', language: 'Chinese (Mandarin)', voiceId: 'Polly.Zhiyu', name: 'Zhiyu', type: 'standard', gender: 'female' },

            // Chinese (Cantonese)
            { language_code: 'zh-HK', language: 'Chinese (Cantonese)', voiceId: 'Polly.Hiujin-Neural', name: 'Hiujin', type: 'neural', gender: 'female' },

            // Chinese (Taiwanese Mandarin)
            { language_code: 'zh-TW', language: 'Chinese (Taiwanese Mandarin)', voiceId: 'alice', name: 'Alice', type: 'standard', gender: 'female' },
        
        
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
    {
        key: 'elevenlabs',
        label: "ElevenLabs",
        tts_voice: [
            //GET VOICES FROM ELEVENLABS API
        ],
        tts_model: [
            //GET MODELS FROM ELEVENLABS API
        ],
        stt_model: [
            { model: 'scribe_v1',                   name: 'scribe_v1',                  status: 'active' },
            { model: 'scribe_v1_experimental',      name: 'scribe_v1_experimental',     status: 'active' },
        ]
    }
]