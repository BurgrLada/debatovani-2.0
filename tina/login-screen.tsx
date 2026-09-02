/**
 * Přihlašovací obrazovka administrace.
 *
 * Tina ve výchozím stavu ukazuje před přihlášením modální okno s nadpisem
 * „Enter into edit mode“ a větou „When you save, changes will be saved to the
 * local filesystem.“ Ta věta je v Tině natvrdo pro každý self-hosted režim
 * a **u nás není pravda** — uložení jde přes GitHub API do repozitáře, ne na
 * disk serveru. Nejde přebít textem, jde jen nahradit celou obrazovkou:
 * `getLoginStrategy()` vrátí `'LoginScreen'` a Tina vykreslí tuhle komponentu
 * místo svého modálu (viz `tina/auth-provider.ts`).
 *
 * Styly jsou inline schválně. Administrace nemá Tailwind z webu, takže by se
 * třídy nepropsaly, a načítat kvůli jedné obrazovce vlastní CSS do bundlu
 * Tiny je víc práce než užitku.
 *
 * **Past, na kterou se tu dá snadno naletět:** Tina obrazovku vykresluje
 * prostým voláním funkce (`loginScreen({ handleAuthenticate })`), ne jako
 * JSX element. Hooky napsané přímo v exportované funkci by proto patřily
 * *Tinině* komponentě — a v okamžiku přihlášení, kdy se větev přepne na
 * administraci, by z jejího renderu zmizely. React na to odpoví chybou
 * „Rendered fewer hooks than expected“, `#root` zůstane prázdný a Tina to
 * po dvou sekundách přebarví na zavádějící „Failed loading TinaCMS assets“.
 *
 * Proto je export bez hooků a jen vrací element vnitřní komponenty: ta se
 * mountuje normálně a svůj stav si drží sama.
 */
import { useState } from 'react';
import type { LoginScreenProps } from 'tinacms';

const BRAND = '#0d3c61';

/** Bez hooků — jen obálka, viz poznámka v hlavičce souboru. */
export function LoginScreen(props: LoginScreenProps) {
	return <LoginForm {...props} />;
}

function LoginForm({ handleAuthenticate }: LoginScreenProps) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const signIn = async () => {
		setBusy(true);
		setError(null);

		try {
			await handleAuthenticate();
		} catch (e) {
			// Přesměrování na Google se nemuselo povést — třeba když je server
			// špatně nakonfigurovaný. Bez téhle hlášky by tlačítko jen zůstalo
			// viset a nikdo by nevěděl proč.
			setError(e instanceof Error ? e.message : 'Přihlášení se nepodařilo spustit.');
			setBusy(false);
		}
	};

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '2rem',
				background: '#f6f7f9',
				fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: '26rem',
					background: '#fff',
					borderRadius: '12px',
					boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.08)',
					padding: '2.5rem 2rem',
					textAlign: 'center',
				}}
			>
				<img
					src="/media/brand/logo.png"
					alt="Asociace debatních klubů"
					style={{ height: '64px', width: 'auto', margin: '0 auto 1.75rem' }}
				/>

				<h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 .5rem', color: '#111' }}>
					Administrace webu
				</h1>

				<p style={{ margin: '0 0 1.75rem', color: '#555', fontSize: '.9375rem', lineHeight: 1.5 }}>
					Přihlaste se pracovním účtem Google.
				</p>

				{error && (
					<p
						role="alert"
						style={{
							margin: '0 0 1rem',
							padding: '.625rem .75rem',
							borderRadius: '8px',
							background: '#fdecea',
							color: '#8c1d18',
							fontSize: '.875rem',
							textAlign: 'left',
						}}
					>
						{error}
					</p>
				)}

				<button
					type="button"
					onClick={signIn}
					disabled={busy}
					style={{
						width: '100%',
						padding: '.75rem 1rem',
						border: 0,
						borderRadius: '8px',
						background: busy ? '#6b7f92' : BRAND,
						color: '#fff',
						fontSize: '.9375rem',
						fontWeight: 600,
						cursor: busy ? 'progress' : 'pointer',
					}}
				>
					{busy ? 'Přesměrovávám na Google…' : 'Přihlásit se účtem Google'}
				</button>

				<p style={{ margin: '1.5rem 0 0', color: '#777', fontSize: '.8125rem', lineHeight: 1.5 }}>
					Dovnitř se dostanou jen adresy na doméně organizace, které mají přístup
					povolený. Změny se ukládají do repozitáře na GitHubu.
				</p>
			</div>
		</div>
	);
}
