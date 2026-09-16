// Section references follow the topic order within each category.
const MANUAL_SECTIONS = {
    hypcut: {
        general: [[]],
        quickstart: [['2.1'], ['2.2'], ['2.3.1'], ['2.3']],
        plan: [['3']],
        production: [
            ['4.1.1.2'], ['4.2.1', '4.2.2'], ['4.3.1'], ['4.3.2'],
            ['4.3.3'], ['4.3.4'], ['4.3.5', '4.3.6', '4.3.7'], ['4.3.1'],
            ['4.3.8'], ['4.2.4.4'], ['4.4'], ['4.3.1'], ['2.3.7'],
            ['3.2', '4.2.4.5'], ['4.5'], ['4.6'], ['4.11', '4.12'],
            ['4.7', '4.8', '4.9', '4.10', '4.13', '4.14', '4.15', '4.16', '4.17', '4.19', '4.20', '4.21', '4.22']
        ],
        debug: [['5.2', '5.3'], ['5.4', '5.5', '5.6', '5.7'], ['5.8', '5.9']],
        technique: [['6']],
        diagnosis: [['7.9'], ['7.1'], ['7.2', '7.3', '7.4'], ['7.5', '7.6', '7.8']],
        maintenance: [['8']],
        settings: [['9.1.1'], ['9.1.2'], ['9.1.3'], ['9.1.4'], ['9.2'], ['9.3', '9.4']],
        coordinates: [['10.1', '10.3']]
    },
    cypcut: {
        quickstart: [[], ['1.3.2', '1.3.3'], ['1.4'], ['1.3.4']],
        graphicedit: [['2.2'], ['2.3'], ['2.4', '2.5'], ['2.6', '2.7'], ['2.8'], ['2.9']],
        techniquetools: [
            ['3.1'], ['3.2'], ['3.3'], ['3.4'], ['3.5', '3.6'], ['3.7'],
            ['3.8'], ['3.9'], ['3.10'], ['3.11'], ['3.13'], ['3.13.2'],
            ['3.13.3', '3.13.4'], ['3.14'], ['3.15']
        ],
        machiningcontrol: [['4.1'], ['4.2'], ['4.3'], ['4.4', '4.5', '4.6'], ['4.7', '4.8', '4.9'], ['4.10']],
        cncassistant: [['5.1'], ['5.2'], ['5.3'], ['5.4'], ['5.6', '5.7', '5.8', '5.9', '5.10']],
        appendix: [['6.1'], ['6.2'], ['6.3', '6.4'], ['6.5', '6.6', '6.7', '6.8']]
    }
};

const manualMapRequests = new Map();

function manualTopicSections(answer, system) {
    for (const category of SYSTEMS[system].categories) {
        const index = category.topics.findIndex(topic => topic.full === answer || topic.short === answer);
        if (index !== -1) return MANUAL_SECTIONS[system][category.id]?.[index] || [];
    }
    return [];
}

async function appendManualImages(bubble, answer, system) {
    const sections = manualTopicSections(answer, system);
    if (!sections.length) return;
    const folder = system === 'cypcut' ? 'CypCut-manual-el' : 'HypCut-manual-el';
    try {
        if (!manualMapRequests.has(system)) {
            manualMapRequests.set(system, fetch(folder + '/img/map.json').then(response => {
                if (!response.ok) throw new Error('Manual image map unavailable');
                return response.json();
            }).catch(error => {
                manualMapRequests.delete(system);
                throw error;
            }));
        }
        const map = await manualMapRequests.get(system);
        const images = new Map();
        for (const [section, filenames] of Object.entries(map)) {
            if (!sections.some(ref => section === ref || section.startsWith(ref + '.'))) continue;
            for (const filename of filenames) {
                if (/^p\d+_\d+\.png$/.test(filename) && !images.has(filename)) images.set(filename, section);
            }
        }
        if (!images.size || !bubble.isConnected) return;
        const gallery = document.createElement('div');
        gallery.className = 'manual-gallery';
        for (const [filename, section] of images) {
            const figure = document.createElement('figure');
            const link = document.createElement('a');
            link.href = folder + '/img/' + filename;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            const page = Number(filename.match(/^p(\d+)_/)[1]);
            const label = SYSTEMS[system].label + ' \u00a7' + section + ' \u00b7 \u03a3\u03b5\u03bb\u03af\u03b4\u03b1 PDF ' + page;
            link.title = '\u039c\u03b5\u03b3\u03ad\u03b8\u03c5\u03bd\u03c3\u03b7: ' + label;
            const img = document.createElement('img');
            img.src = link.href;
            img.alt = label;
            img.loading = 'lazy';
            img.addEventListener('error', () => figure.remove(), { once: true });
            link.appendChild(img);
            const caption = document.createElement('figcaption');
            caption.textContent = label;
            figure.append(link, caption);
            gallery.appendChild(figure);
        }
        bubble.appendChild(gallery);
    } catch (error) {
        // A failed image request must not hide the text answer.
        console.warn('Manual images could not be loaded', error);
    }
}
