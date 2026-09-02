import styles from './discard-notice.module.css';

type DiscardNoticeProps = {
  onKeepEditing: () => void;
  onDiscard: () => void;
};

export function DiscardNotice({ onKeepEditing, onDiscard }: DiscardNoticeProps) {
  return (
    <div className={styles.notice} role="status">
      <span>Discard unsaved changes?</span>
      <div>
        <button type="button" onClick={onKeepEditing}>Keep editing</button>
        <button type="button" onClick={onDiscard}>Discard</button>
      </div>
    </div>
  );
}
