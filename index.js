// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Intersection Observer for fade-in animations
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .showcase-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// ----- SLIDER LOGIC -----
const track = document.querySelector('.slider-track');
const images = document.querySelectorAll('.slider-track img');
const prevBtn = document.querySelector('.slider-btn.prev');
const nextBtn = document.querySelector('.slider-btn.next');
let currentIndex = 0;

function updateSlide() {
    const containerWidth = track.parentElement.clientWidth;
    track.style.transform = `translateX(-${currentIndex * containerWidth}px)`;
}

// Previous/Next buttons
prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateSlide();
    setActiveNavByIndex(currentIndex);
});

nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % images.length;
    updateSlide();
    setActiveNavByIndex(currentIndex);
});

// Sync sidebar active state with image index
function setActiveNavByIndex(index) {
    const navItems = [homeBtn, productsBtn, salesBtn, customersBtn,analyticsBtn ,reciptBtn,settingsBtn];
    navItems.forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Sidebar buttons – jump to corresponding image
const homeBtn = document.getElementById('mockhome');
const productsBtn = document.getElementById('mockproducts');
const salesBtn = document.getElementById('mocksales');
const customersBtn = document.getElementById('mockcustomers');
const analyticsBtn = document.getElementById('mockanalytics');
const reciptBtn = document.getElementById('mockrecipt');
const settingsBtn = document.getElementById('mocksettings');    

homeBtn.addEventListener('click', () => {
    currentIndex = 0;
    updateSlide();
    setActiveNavByIndex(0);
});
productsBtn.addEventListener('click', () => {
    currentIndex = 1;
    updateSlide();
    setActiveNavByIndex(1);
});
salesBtn.addEventListener('click', () => {
    currentIndex = 2;
    updateSlide();
    setActiveNavByIndex(2);
});
customersBtn.addEventListener('click', () => {
    currentIndex = 3;
    updateSlide();
    setActiveNavByIndex(3);
});
analyticsBtn.addEventListener('click', () => {
    currentIndex = 4;
    updateSlide();
    setActiveNavByIndex(4);
});
reciptBtn.addEventListener('click', () => {
    currentIndex = 5;
    updateSlide();
    setActiveNavByIndex(5);
});
settingsBtn.addEventListener('click', () => {
    currentIndex = 6;
    updateSlide();
    setActiveNavByIndex(6);
});
// Update slide on window resize (keeps images aligned)
window.addEventListener('resize', updateSlide);

// ----- ZOOM MODAL -----
const modal = document.getElementById('image-modal');
const modalImg = modal.querySelector('img');

// Use event delegation on the track because images can be added/removed
track.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
        modalImg.src = e.target.src;
        modal.style.display = 'flex';
    }
});

// Close modal when clicking outside the image (already handled by onclick on modal)

document.querySelectorAll('.feature-card, .showcase-item, .review-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

