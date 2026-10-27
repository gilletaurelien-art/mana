import { useState } from "react";

// Formulaire de contact du footer — vers contact@mana.bzh (via manahome.org).
// Vitrine statique : l'envoi est simulé (aucun backend). En prod : API +
// rate-limit anti-spam. Aucune donnée ne quitte le navigateur en l'état.

interface ContactState {
  nom: string;
  prenom: string;
  courriel: string;
  message: string;
}

export function ContactForm() {
  const [form, setForm] = useState<ContactState>({
    nom: "",
    prenom: "",
    courriel: "",
    message: "",
  });
  const [envoye, setEnvoye] = useState(false);

  const valide =
    form.nom.trim() &&
    form.prenom.trim() &&
    form.courriel.includes("@") &&
    form.message.trim();

  const envoyer = () => {
    if (!valide) return;
    setEnvoye(true);
  };

  const champ = (k: keyof ContactState) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value }),
  });

  if (envoye) {
    return (
      <div className="contact-form" role="status">
        <p className="contact-merci">
          Merci {form.prenom}, votre message a bien été envoyé. Nous
          répondons à <strong>{form.courriel}</strong> très vite.
        </p>
        <button
          type="button"
          className="btn btn-clair-ghost"
          onClick={() => {
            setEnvoye(false);
            setForm({ nom: "", prenom: "", courriel: "", message: "" });
          }}
        >
          Écrire un autre message
        </button>
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        envoyer();
      }}
    >
      <p className="apercu-label">Écrire à MANA.bzh</p>
      <div className="contact-grid">
        <div className="champ">
          <label htmlFor="contact-nom">Nom *</label>
          <input id="contact-nom" type="text" autoComplete="family-name" {...champ("nom")} />
        </div>
        <div className="champ">
          <label htmlFor="contact-prenom">Prénom *</label>
          <input id="contact-prenom" type="text" autoComplete="given-name" {...champ("prenom")} />
        </div>
      </div>
      <div className="champ">
        <label htmlFor="contact-courriel">Courriel *</label>
        <input
          id="contact-courriel"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          {...champ("courriel")}
        />
      </div>
      <div className="champ">
        <label htmlFor="contact-message">Message *</label>
        <textarea id="contact-message" rows={4} {...champ("message")} />
      </div>
      <div className="est-actions">
        <button type="submit" className="btn btn-clair" disabled={!valide}>
          Envoyer
        </button>
      </div>
      <p className="contact-note">
        Votre message part vers contact@mana.bzh. Aucune donnée n'est
        revendue ; vous pouvez demander la suppression à tout moment.
      </p>
    </form>
  );
}
