const systemLanguage =
  localStorage.getItem("systemLanguage") ||
  localStorage.getItem("language") ||
  "en";

let currentLanguage = systemLanguage;
localStorage.setItem("language", currentLanguage);


function translateUI() {
    // Check if translations are loaded
    if (!translations || !translations[currentLanguage]) {
        console.error("Translations not loaded for language:", currentLanguage);
        return;
    }

    // Translate regular text content
    document.querySelectorAll("[data-translate]").forEach(el => {
        const key = el.getAttribute("data-translate");
        const translatedText = translate(key);
        
        if (translatedText && translatedText !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = translatedText;
            } else if (el.tagName === 'OPTION') {
                el.textContent = translatedText;
            } else {
                el.textContent = translatedText;
            }
        }
    });

    // Translate placeholder text
    document.querySelectorAll("[data-translate-placeholder]").forEach(el => {
        const key = el.getAttribute("data-translate-placeholder");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("placeholder", translatedText);
        }
    });

    // Translate title attributes
    document.querySelectorAll("[data-translate-title]").forEach(el => {
        const key = el.getAttribute("data-translate-title");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("title", translatedText);
        }
    });

    // Translate alt attributes
    document.querySelectorAll("[data-translate-alt]").forEach(el => {
        const key = el.getAttribute("data-translate-alt");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("alt", translatedText);
        }
    });

    // Translate aria-label attributes
    document.querySelectorAll("[data-translate-aria-label]").forEach(el => {
        const key = el.getAttribute("data-translate-aria-label");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("aria-label", translatedText);
        }
    });

    // Handle data-translate-rating for dynamic values
    document.querySelectorAll("[data-translate-rating]").forEach(el => {
        const key = el.getAttribute("data-translate");
        const rating = el.getAttribute("data-translate-rating");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.textContent = translatedText.replace("{rating}", rating);
        }
    });

    // Handle data-translate-value for numeric values
    document.querySelectorAll("[data-translate-value]").forEach(el => {
        const key = el.getAttribute("data-translate");
        const value = el.getAttribute("data-translate-value");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.textContent = translatedText.replace("{value}", value);
        }
    });
}


// Initialize translation on page load
document.addEventListener("DOMContentLoaded", async () => {
    await loadBusinessInfo2();
    const languageSelector = document.getElementById("languageSelector");

    if (languageSelector) {
    languageSelector.value = currentLanguage;

    languageSelector.addEventListener("change", async (e) => {
        currentLanguage = e.target.value;

        // Save user choice
        localStorage.setItem("language", currentLanguage);

        // Sync to main process
        if (window.electronAPI?.setLanguage) {
        await window.electronAPI.setLanguage(currentLanguage);
        }

        translateUI();
    });
    }

 translateUI();
   updateAllText(); 
 
   
    

});
async function loadBusinessInfo2() {
  try {
    const response = await fetch(`${API_BASE}/api/business-info`);
    if (!response.ok) throw new Error('Failed to load business info');

    const data = await response.json();

    // Only keep language from backend
    const backendLanguage = data?.currentLanguage || null;

    // Read existing values
    const userLanguage = localStorage.getItem('language');
    const systemLanguage = localStorage.getItem('systemLanguage');

    currentLanguage =
      userLanguage ||
      systemLanguage ||
      backendLanguage ||
      'en';

    // Persist
    localStorage.setItem('language', currentLanguage);

    // Update selector
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
      languageSelector.value = currentLanguage;
    }

    // Translate UI
    if (typeof translateUI === 'function') {
      translateUI();
    }

    console.log('🌐 Language resolved as:', currentLanguage);

  } catch (error) {
    console.error('Language load failed, using fallback:', error);

    // Absolute fallback
    currentLanguage =
      localStorage.getItem('language') ||
      localStorage.getItem('systemLanguage') ||
      'en';

    localStorage.setItem('language', currentLanguage);

    if (typeof translateUI === 'function') {
      translateUI();
    }
  }
}

function updateDynamicTranslation(elementId, translationKey, dynamicValues = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (translations[currentLanguage] && translations[currentLanguage][translationKey]) {
        let translation = translations[currentLanguage][translationKey];
        
        // Replace all placeholders with values
        Object.keys(dynamicValues).forEach(key => {
            translation = translation.replace(`{${key}}`, dynamicValues[key]);
        });
        
        element.textContent = translation;
    }
}
function translate(key) {
    
    
    if (!translations) {
        console.error("Translations object is undefined!");
        return key;
    }
    
 
    
    // Handle nested keys
    const keys = key.split('.');
    let translationObj = translations[currentLanguage];
    
    for (let i = 0; i < keys.length; i++) {
       
        if (translationObj && translationObj[keys[i]] !== undefined) {
            translationObj = translationObj[keys[i]];
        } else {
            console.warn(`Key part "${keys[i]}" not found for key "${key}"`);
            return key;
        }
    }
    
    return translationObj;
}
// Function to set data-translate-value attribute and update translation
function setTranslatedValue(elementId, value, translationKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.setAttribute("data-translate-value", value);
    element.setAttribute("data-translate", translationKey);
    
    if (translations[currentLanguage] && translations[currentLanguage][translationKey]) {
        const translation = translations[currentLanguage][translationKey];
        element.textContent = translation.replace("{value}", value);
    }
}

// Function to set data-translate-rating attribute and update translation
function setTranslatedRating(elementId, rating, translationKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.setAttribute("data-translate-rating", rating);
    element.setAttribute("data-translate", translationKey);
    
    if (translations[currentLanguage] && translations[currentLanguage][translationKey]) {
        const translation = translations[currentLanguage][translationKey];
        element.textContent = translation.replace("{rating}", rating);
    }
}
        function updateAllText() {
            // Update all elements with data-translate-key attributes
            document.querySelectorAll('[data-translate-key]').forEach(element => {
                const key = element.getAttribute('data-translate-key');
                if (key) {
                    const translated = translate(key);
                    if (translated && translated !== key) {
                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                            element.placeholder = translated;
                        } else {
                            element.textContent = translated;
                        }
                    }
                }
            });
            
            // Update title separately
            const titleElement = document.querySelector('title[data-translate-key]');
            if (titleElement) {
                const key = titleElement.getAttribute('data-translate-key');
                document.title = translate(key) || 'LicenseManagerPro';
            }
        }


window.electronAPI.ensureLanguageFile().then(() => {
  console.log('Language file ensured');
});