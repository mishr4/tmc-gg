document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    const tabs = document.querySelectorAll('.mobile-tabbar .tab');
    const navLinks = document.querySelectorAll('.nav-link[data-page]');

    const pageTitles = {
        home: 'TMC — The Mavion Corporation | Mavion Media Network',
        services: 'Services — TMC | Mavion Media Network',
        ciryacast: 'TMCast Radio Hosting — TMC | Plans & Pricing',
        about: 'About — TMC | The Mavion Corporation',
        join: 'Careers — TMC | Mavion Media Network'
    };

    function navigateTo(pageId) {
        document.title = pageTitles[pageId] || pageTitles.home;

        pages.forEach(p => {
            const isTarget = p.id === 'page-' + pageId;
            p.classList.toggle('active', isTarget);
            p.style.display = isTarget ? 'block' : 'none';
        });

        tabs.forEach(t => t.classList.toggle('active', t.dataset.page === pageId));
        navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));

        window.scrollTo({ top: 0, behavior: 'instant' });
        history.pushState({ page: pageId }, '', '#' + pageId);
    }

    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-page]');
        if (el) {
            e.preventDefault();
            navigateTo(el.dataset.page);
        }
    });

    window.addEventListener('popstate', (e) => {
        navigateTo(e.state?.page || 'home');
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('page-' + hash)) {
        navigateTo(hash);
    } else {
        history.replaceState({ page: 'home' }, '', '#home');
    }

    // FAQ accordion
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });
});
