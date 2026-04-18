
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 80) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });

        // Hero Slider Logic
        const heroTrack = document.getElementById('hero-track');
        const heroSlides = document.querySelectorAll('.hero-slideshow .slide');
        let heroIndex = 0;

        function rotateHero() {
            heroIndex = (heroIndex + 1) % heroSlides.length;
            heroTrack.style.transform = `translateX(-${heroIndex * (100 / 7)}%)`;
            
            // Update active class for text animations
            heroSlides.forEach((s, i) => {
                if(i === heroIndex) s.classList.add('active');
                else s.classList.remove('active');
            });
        }
        setInterval(rotateHero, 6000);

        // Interface Slider Logic
        const interfaceTrack = document.getElementById('interface-track');
        const sidebarItems = document.querySelectorAll('.mock-nav-item');

        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const index = item.getAttribute('data-index');
                
                // Sidebar active state
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Move track
                const slideWidth = interfaceTrack.parentElement.clientWidth;
                interfaceTrack.style.transform = `translateX(-${index * slideWidth}px)`;
            });
        });

        // Resize Fix
        window.addEventListener('resize', () => {
            const activeItem = document.querySelector('.mock-nav-item.active');
            const index = activeItem.getAttribute('data-index');
            const slideWidth = interfaceTrack.parentElement.clientWidth;
            interfaceTrack.style.transform = `translateX(-${index * slideWidth}px)`;
        });

        // Zoom Modal
        const modal = document.getElementById('image-modal');
        const modalImg = modal.querySelector('img');
        
        interfaceTrack.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                modalImg.src = e.target.src;
                modal.style.display = 'flex';
            }
        });

        modal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
// Contact form submission
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = contactForm.querySelector('input[name="name"]').value;
    const email = contactForm.querySelector('input[name="email"]').value;
    const message = contactForm.querySelector('textarea[name="message"]').value;
    
    // Disable button to prevent double submission
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch('https://stocksalesapp-store.vercel.app/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Thank you for your inquiry! We will get back to you soon.');
            contactForm.reset();
        } else {
            alert('Error: ' + (data.error || 'Something went wrong. Please try again.'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('There was an error sending your message. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Inquiry';
    }
});


  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    localStorage.setItem('visitor_id', visitorId);
  }

  // Collect browser and device info
  const ua = navigator.userAgent;
  const getBrowser = () => {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  };
  const getOS = () => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
  };
  const getDeviceType = () => {
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) return 'tablet';
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  };

  // Send tracking data
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: visitorId,
      pageUrl: window.location.href,
      referrer: document.referrer || 'direct',
      browser: getBrowser(),
      os: getOS(),
      deviceType: getDeviceType(),
    })
  }).catch(err => console.error('Tracking error:', err));
