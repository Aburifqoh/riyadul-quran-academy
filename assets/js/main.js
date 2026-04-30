/**
 * Riyadul Quran Academy - Shared JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initScrollAnimations();
    initCounters();
    initActiveNavLink();
});

// Navbar Sticky Behavior
function initNavbar() {
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('shadow-lg', 'bg-white/95', 'backdrop-blur-sm');
        } else {
            header.classList.remove('shadow-lg', 'bg-white/95', 'backdrop-blur-sm');
        }
    });
}

// Mobile Menu Toggle
function initMobileMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('flex');
        });
    }
}

// Scroll Animations (Fade-in Up)
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100', 'translate-y-0');
                entry.target.classList.remove('opacity-0', 'translate-y-8');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach(el => {
        el.classList.add('transition-all', 'duration-1000', 'ease-out', 'opacity-0', 'translate-y-8');
        observer.observe(el);
    });
}

// Stats Counter Animation
function initCounters() {
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const endValue = parseInt(target.getAttribute('data-target'));
                const duration = 2000;
                let startValue = 0;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const currentValue = Math.floor(progress * endValue);
                    
                    target.textContent = currentValue;

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        target.textContent = endValue;
                    }
                }

                requestAnimationFrame(updateCounter);
                counterObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    const counters = document.querySelectorAll('.counter-value');
    counters.forEach(counter => counterObserver.observe(counter));
}

// Active Nav Link Highlight
function initActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('text-gold', 'font-bold');
        }
    });
}
