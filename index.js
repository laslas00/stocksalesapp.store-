
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
