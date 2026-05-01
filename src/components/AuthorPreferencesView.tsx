import { Ban, RotateCcw, Star } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import styles from './AuthorPreferencesView.module.css';
import {
  AuthorPreferenceEntry,
  AuthorPreferencesState,
  AuthorPreferenceStatus,
} from '../types/linkedin';

interface AuthorPreferencesViewProps {
  preferences: AuthorPreferencesState;
  detectedAuthors: AuthorPreferenceEntry[];
  onAuthorPreferenceChange: (author: string, status: AuthorPreferenceStatus) => void;
}

type ManagedStatus = Exclude<AuthorPreferenceStatus, 'neutral'>;

const STATUS_COPY: Record<ManagedStatus, { title: string; empty: string }> = {
  favorite: {
    title: 'Favoritos',
    empty: 'No hay autores favoritos guardados.',
  },
  blacklisted: {
    title: 'Blacklist',
    empty: 'No hay autores en blacklist.',
  },
};

export function AuthorPreferencesView({
  preferences,
  detectedAuthors,
  onAuthorPreferenceChange,
}: AuthorPreferencesViewProps) {
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualStatus, setManualStatus] = useState<ManagedStatus>('favorite');
  const [selectedDetectedAuthor, setSelectedDetectedAuthor] = useState('');

  const detectedOptions = useMemo(
    () =>
      detectedAuthors.filter(
        (author) =>
          !preferences.favorites.some((entry) => entry.key === author.key) &&
          !preferences.blacklist.some((entry) => entry.key === author.key),
      ),
    [detectedAuthors, preferences],
  );

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!manualAuthor.trim()) {
      return;
    }

    onAuthorPreferenceChange(manualAuthor, manualStatus);
    setManualAuthor('');
  };

  const addDetectedAuthor = (status: ManagedStatus) => {
    const author = detectedOptions.find((entry) => entry.key === selectedDetectedAuthor);

    if (!author) {
      return;
    }

    onAuthorPreferenceChange(author.displayName, status);
    setSelectedDetectedAuthor('');
  };

  return (
    <section className={styles.view}>
      <div className={styles.toolbar}>
        <form className={styles.panel} onSubmit={handleManualSubmit}>
          <div>
            <h2 className={styles.panelTitle}>Agregar manualmente</h2>
            <p className={styles.panelHint}>El nombre visible se usa como identidad persistida.</p>
          </div>
          <div className={styles.inlineControls}>
            <input
              className={styles.textInput}
              type="text"
              value={manualAuthor}
              onChange={(event) => setManualAuthor(event.target.value)}
              placeholder="Nombre del autor"
              aria-label="Nombre del autor"
            />
            <select
              className={styles.select}
              value={manualStatus}
              onChange={(event) => setManualStatus(event.target.value as ManagedStatus)}
              aria-label="Lista destino"
            >
              <option value="favorite">Favoritos</option>
              <option value="blacklisted">Blacklist</option>
            </select>
            <button className={styles.primaryButton} type="submit">
              Agregar
            </button>
          </div>
        </form>

        <div className={styles.panel}>
          <div>
            <h2 className={styles.panelTitle}>Autores detectados</h2>
            <p className={styles.panelHint}>
              {detectedAuthors.length
                ? `${detectedAuthors.length} autores en el JSON actual`
                : 'Carga un JSON para seleccionar autores detectados.'}
            </p>
          </div>
          <div className={styles.inlineControls}>
            <select
              className={styles.select}
              value={selectedDetectedAuthor}
              onChange={(event) => setSelectedDetectedAuthor(event.target.value)}
              disabled={detectedOptions.length === 0}
              aria-label="Autores detectados"
            >
              <option value="">Seleccionar autor</option>
              {detectedOptions.map((author) => (
                <option key={author.key} value={author.key}>
                  {author.displayName}
                </option>
              ))}
            </select>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => addDetectedAuthor('favorite')}
              disabled={!selectedDetectedAuthor}
              title="Agregar a favoritos"
              aria-label="Agregar autor detectado a favoritos"
            >
              <Star size={16} />
            </button>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => addDetectedAuthor('blacklisted')}
              disabled={!selectedDetectedAuthor}
              title="Agregar a blacklist"
              aria-label="Agregar autor detectado a blacklist"
            >
              <Ban size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.lists}>
        <PreferenceList
          status="favorite"
          entries={preferences.favorites}
          onAuthorPreferenceChange={onAuthorPreferenceChange}
        />
        <PreferenceList
          status="blacklisted"
          entries={preferences.blacklist}
          onAuthorPreferenceChange={onAuthorPreferenceChange}
        />
      </div>
    </section>
  );
}

interface PreferenceListProps {
  status: ManagedStatus;
  entries: AuthorPreferenceEntry[];
  onAuthorPreferenceChange: (author: string, status: AuthorPreferenceStatus) => void;
}

function PreferenceList({ status, entries, onAuthorPreferenceChange }: PreferenceListProps) {
  return (
    <section className={styles.listPanel}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>{STATUS_COPY[status].title}</h2>
        <span className={styles.countBadge}>{entries.length}</span>
      </div>
      {entries.length ? (
        <ul className={styles.authorList}>
          {entries.map((entry) => (
            <li className={styles.authorRow} key={entry.key}>
              <span className={styles.authorName}>{entry.displayName}</span>
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => onAuthorPreferenceChange(entry.displayName, 'neutral')}
                title="Quitar de la lista"
                aria-label={`Quitar ${entry.displayName} de la lista`}
              >
                <RotateCcw size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{STATUS_COPY[status].empty}</p>
      )}
    </section>
  );
}
