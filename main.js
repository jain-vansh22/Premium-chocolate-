import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Sticky Navigation ---
    const nav = document.getElementById('navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        if (window.scrollY > lastScrollY && window.scrollY > 200) {
            nav.classList.add('hidden-on-scroll');
        } else {
            nav.classList.remove('hidden-on-scroll');
        }
        lastScrollY = window.scrollY;
    });

    // --- 2. Hero Text Reveal ---
    const heroTitle = document.querySelector('.hero-headline');
    if (heroTitle) {
        // Split text roughly by words
        const words = heroTitle.innerHTML.split('<br>').map(line => {
            return line.split(' ').map(word => `<span class="word"><span>${word}</span></span>`).join(' ');
        }).join('<br>');
        heroTitle.innerHTML = words;

        gsap.to('.hero-headline .word span', {
            y: '0%',
            duration: 1.5,
            ease: 'power4.out',
            stagger: 0.2,
            delay: 0.5
        });
        
        gsap.from('.hero-subheadline, .hero-actions', {
            opacity: 0,
            y: 20,
            duration: 1,
            delay: 1.5,
            ease: 'power3.out',
            stagger: 0.2
        });
    }

    // --- 3. Three.js Hero Scene (Chocolate Bar + Particles) ---
    const initThreeJS = () => {
        const container = document.getElementById('three-canvas-container');
        if (!container) return;

        const scene = new THREE.Scene();
        
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 10;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Lighting (dramatic top-right and warm amber from below)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffeedd, 3);
        dirLight.position.set(5, 5, 2);
        scene.add(dirLight);

        const amberLight = new THREE.PointLight(0xd48b4c, 5, 20);
        amberLight.position.set(0, -5, 2);
        scene.add(amberLight);

        // Chocolate Bar Group (for fragments)
        const chocoGroup = new THREE.Group();
        scene.add(chocoGroup);

        const materialDark = new THREE.MeshStandardMaterial({ 
            color: 0x1A0D08, 
            roughness: 0.6,
            metalness: 0.1
        });
        
        const materialGold = new THREE.MeshStandardMaterial({ 
            color: 0xC9A84C, 
            roughness: 0.3,
            metalness: 0.8
        });

        // Create fragments that form a bar
        const fragments = [];
        const numPieces = 6;
        for (let i = 0; i < numPieces; i++) {
            const geom = new THREE.BoxGeometry(1.5, 0.8, 0.3);
            const mesh = new THREE.Mesh(geom, i === 0 ? materialGold : materialDark);
            
            // Initial random exploded position
            mesh.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            chocoGroup.add(mesh);
            fragments.push(mesh);
            
            // Target positions to form a grid
            const targetX = (i % 2) * 1.6 - 0.8;
            const targetY = Math.floor(i / 2) * -0.9 + 0.9;
            
            // Animate fragments coming together
            gsap.to(mesh.position, {
                x: targetX,
                y: targetY,
                z: 0,
                duration: 2.5,
                ease: 'power3.inOut',
                delay: 0.5
            });
            gsap.to(mesh.rotation, {
                x: 0,
                y: 0,
                z: 0,
                duration: 2.5,
                ease: 'power3.inOut',
                delay: 0.5
            });
        }
        
        // Tilt the whole group slightly
        chocoGroup.rotation.x = 0.2;
        chocoGroup.rotation.y = -0.3;

        // Auto rotate group slowly
        gsap.to(chocoGroup.rotation, {
            y: "+=" + (Math.PI * 2),
            duration: 30,
            repeat: -1,
            ease: "none"
        });

        // Dust Particles
        const particleGeom = new THREE.BufferGeometry();
        const particleCount = 200;
        const posArray = new Float32Array(particleCount * 3);
        
        for(let i = 0; i < particleCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15;
        }
        
        particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMat = new THREE.PointsMaterial({
            size: 0.05,
            color: 0xC9A84C,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(particleGeom, particleMat);
        scene.add(particles);

        // Parallax mouse effect
        let mouseX = 0;
        let mouseY = 0;
        
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.addEventListener('mousemove', (e) => {
                mouseX = (e.clientX / window.innerWidth) * 2 - 1;
                mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
            });
        }

        // Render loop
        const clock = new THREE.Clock();
        
        const animate = () => {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            
            // Particles logic
            particles.rotation.y = elapsedTime * 0.05;
            const positions = particles.geometry.attributes.position.array;
            for(let i = 1; i < particleCount * 3; i += 3) {
                positions[i] += 0.01;
                if (positions[i] > 7) {
                    positions[i] = -7;
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Parallax
            chocoGroup.position.x += (mouseX * 0.5 - chocoGroup.position.x) * 0.05;
            chocoGroup.position.y += (mouseY * 0.5 - chocoGroup.position.y) * 0.05;

            renderer.render(scene, camera);
        };
        
        animate();

        // Resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    };

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        initThreeJS();
    }

    // --- 4. CSS 3D Tilt for Product Cards ---
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;
            
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.boxShadow = `0 20px 40px rgba(201, 168, 76, 0.1)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            card.style.boxShadow = `none`;
        });
    });

    // --- 5. The Craft Timeline Scroll Animation ---
    const goldLine = document.querySelector('.gold-line');
    if (goldLine) {
        gsap.fromTo(goldLine, 
            { scaleY: 0 },
            {
                scaleY: 1,
                ease: "none",
                scrollTrigger: {
                    trigger: ".timeline-container",
                    start: "top center",
                    end: "bottom center",
                    scrub: true
                }
            }
        );
    }

    const stages = document.querySelectorAll('.timeline-stage');
    stages.forEach((stage, index) => {
        const isLeft = stage.classList.contains('left');
        gsap.from(stage, {
            opacity: 0,
            x: isLeft ? -50 : 50,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: stage,
                start: "top 80%",
            }
        });
    });

    // --- 6. Testimonials Carousel ---
    const slides = document.querySelectorAll('.quote');
    let currentSlide = 0;
    
    if (slides.length > 0) {
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }
    
    // --- Generic Section Fade In ---
    const sections = document.querySelectorAll('section');
    sections.forEach(sec => {
        gsap.from(sec, {
            opacity: 0,
            y: 30,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: sec,
                start: "top 85%",
            }
        });
    });

});
