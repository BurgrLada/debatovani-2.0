/**
 * Přihlašovací most mezi administrací Tiny a better-auth.
 *
 * Běží v prohlížeči jako součást administrace (`/admin`), zatímco ověřování
 * samotné dělá server v `src/pages/api/tina/[...routes].ts`. Tahle třída jen
 * říká Tině „přihlas se sem“ a „tenhle člověk je přihlášený“.
 *
 * Relace je v cookie, kterou nastavuje better-auth a která je `httpOnly` —
 * skript se k ní nedostane. Tina proto nedostává žádný token: požadavky na
 * `/api/tina/*` jdou na stejný origin jako administrace, takže prohlížeč
 * cookie přiloží sám.
 */
import { AbstractAuthProvider, type LoginStrategy } from 'tinacms';
import { createAuthClient } from 'better-auth/client';
import { LoginScreen } from './login-screen';

const authClient = createAuthClient({ basePath: '/api/auth' });

export class GoogleWorkspaceAuthProvider extends AbstractAuthProvider {
	/**
	 * Vlastní přihlašovací obrazovka místo výchozího modálu Tiny.
	 *
	 * Ten by před přihlášením tvrdil „When you save, changes will be saved to
	 * the local filesystem“, což u nás neplatí — ukládá se přes GitHub API do
	 * repozitáře. Text je v Tině natvrdo, takže jediná cesta je nahradit celou
	 * obrazovku (`tina/login-screen.tsx`).
	 */
	getLoginStrategy(): LoginStrategy {
		return 'LoginScreen';
	}

	getLoginScreen() {
		return LoginScreen;
	}

	/** Odchod na Google a zpět na tutéž obrazovku administrace. */
	async authenticate() {
		await authClient.signIn.social({
			provider: 'google',
			callbackURL: window.location.href,
		});
	}

	async getUser() {
		const { data } = await authClient.getSession();

		return data?.user ?? false;
	}

	/**
	 * Tina by sem dala hodnotu do hlavičky `Authorization`. Relace je ale
	 * v cookie, takže se vrací prázdný objekt — Tina ho bere jako „přihlášeno“
	 * a hlavičku nepřidá.
	 */
	async getToken() {
		return {};
	}

	async logout() {
		await authClient.signOut();
	}
}
