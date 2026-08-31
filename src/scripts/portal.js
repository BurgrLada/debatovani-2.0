/*
 * Skript Portálu debatování — přenesený ze starého webu.
 *
 * Drží se původní logiky: aktuality a nadcházející akce se slévají do jednoho
 * seznamu seřazeného podle data. Jediná změna je zdroj aktualit —
 * `/portal/news.json` místo `wp-json/wp/v2/posts`, aby portál fungoval i po
 * vypnutí WordPressu. Tvar dat je stejný, takže zbytek kódu zůstal beze změny.
 */

async function getPosts() {
	const response = await fetch('/portal/news.json');
	const posts = await response.json();
	return posts;
}

async function getEvents() {
	const response = await fetch('https://api-prod.debata21.cz/api/event', {
		method: 'GET',
		mode: 'cors',
		headers: {},
	});
	const events = await response.json();
	const now = new Date();
	const adkEvents = events.filter((e) => e.organizer === 'adk' && new Date(e.hard_deadline) > now);
	return adkEvents;
}

function mergeNews(posts, events) {
	const postsRenamed = posts.map(({ date: updated_at, ...values }) => ({ updated_at, ...values }));
	const news = postsRenamed
		.concat(events)
		.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
	return news;
}

function createEventElem(event) {
	const from = new Date(Date.parse(event.beginning));
	const to = new Date(Date.parse(event.end));
	let date;
	if (from.getMonth() != to.getMonth()) {
		date = `${from.getDate()}. ${from.getMonth() + 1}. – ${to.getDate()}. ${to.getMonth() + 1}. ${to.getFullYear()}`;
	} else {
		date = `${from.getDate()}. – ${to.getDate()}. ${to.getMonth() + 1}. ${to.getFullYear()}`;
	}
	return `
         <a href="https://greybox.debatovani.cz/turnaje/${event.id}" class="bg-[var(--orange)] rounded p-4 shadow-lg grid grid-cols-[25px_1fr] border border-transparent hover:text-black hover:border-black focus:text-black" target="_top">
            <div class="">
               <i class="fa-solid fa-calendar-days"></i>
            </div>
            <div class="">
               <h3 class="text-xl">${date}</h3>
               <h3 class="text-xl">${event.name.cs}</h3>
            </div>
         </a>
  `;
}

function createPostElem(post) {
	return `
         <a href="${post.link}" class="bg-[var(--blue)] rounded p-4 shadow-lg border border-transparent hover:text-black hover:border-black focus:text-black" target="_top">
            <h3 class="text-xl">${post.title.rendered}</h3>
            ${post.excerpt.rendered}
         </a>
  `;
}

async function loadNews() {
	let [posts, events] = await Promise.all([getPosts(), getEvents()]);
	posts = posts.map((p) => {
		return { html: createPostElem(p), ...p };
	});
	events = events.map((e) => {
		return { html: createEventElem(e), ...e };
	});
	const news = mergeNews(posts, events);
	const newsElem = document.getElementById('news');
	if (newsElem) {
		news.forEach((n) => (newsElem.innerHTML += n.html));
		document.getElementById('loading').classList.add('hidden');
	}
}

document.addEventListener('DOMContentLoaded', function () {
	// 1. Safely execute loadNews after DOM is ready
	loadNews();

	// 2. Fix iframe links
	const elements = document.querySelectorAll('a');
	elements.forEach((el) => {
		el.setAttribute('target', '_top');
	});

	// 3. Polyfill for Safari: handle command and commandfor for dialogs unconditionally
	const commandButtons = document.querySelectorAll('button[commandfor]');
	commandButtons.forEach((button) => {
		button.addEventListener('click', (e) => {
			const targetId = button.getAttribute('commandfor');
			const command = button.getAttribute('command');
			const targetElement = document.getElementById(targetId);

			if (targetElement && targetElement.tagName === 'DIALOG') {
				if (command === 'show-modal' && !targetElement.open) {
					e.preventDefault();
					targetElement.showModal();
				} else if (command === 'close' && targetElement.open) {
					e.preventDefault();
					targetElement.close();
				}
			}
		});
	});
});

// Close dialogs on clicking outside (backdrop click)
document.addEventListener('click', (e) => {
	if (e.target.tagName === 'DIALOG' && e.target.open) {
		const rect = e.target.getBoundingClientRect();
		if (
			e.clientX < rect.left ||
			e.clientX > rect.right ||
			e.clientY < rect.top ||
			e.clientY > rect.bottom
		) {
			e.target.close();
		}
	}
});

/* scroll */
const topBtn = document.getElementById('scrollTop');

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function () {
	scrollFunction();
};

function scrollFunction() {
	if (!topBtn) return;
	if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
		topBtn.style.display = 'block';
	} else {
		topBtn.style.display = 'none';
	}
}

// When the user clicks on the button, scroll to the top of the document.
// Původní stránka to řešila inline `onclick="topFunction()"`; posluchač dělá
// totéž, jen nepotřebuje globální funkci na `window`.
topBtn?.addEventListener('click', () => {
	document.body.scrollTop = 0;
	document.documentElement.scrollTop = 0;
});
