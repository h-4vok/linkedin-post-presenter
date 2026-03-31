import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  error: string | null;
  onFileLoad: (file: File) => Promise<void> | void;
}

export function FileUpload({ error, onFileLoad }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setIsLoading(true);

    try {
      await onFileLoad(file);
    } finally {
      setIsLoading(false);
      setIsDragging(false);
    }
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await processFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await processFile(event.dataTransfer.files?.[0]);
  };

  return (
    <section
      className={`${styles.panel} ${isDragging ? styles.dragging : ''}`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className={styles.iconWrap}>
        <UploadCloud size={44} strokeWidth={1.6} />
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>LinkedIn JSON viewer</p>
        <h1 className={styles.title}>Upload your enriched feed dump</h1>
        <p className={styles.description}>
          Drop the <code>.json</code> file here or pick it manually to explore posts, signals and
          interest markers in a focused feed view.
        </p>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? 'Loading file...' : 'Select JSON file'}
        </button>
        <p className={styles.hint}>Drag &amp; drop is supported</p>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <input
        ref={inputRef}
        className={styles.input}
        type="file"
        accept=".json,application/json"
        onChange={handleInputChange}
      />
    </section>
  );
}
