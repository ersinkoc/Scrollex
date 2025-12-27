import { ReactNode } from 'react'
import styles from './BrowserFrame.module.css'

interface BrowserFrameProps {
  children: ReactNode
  url?: string
  title?: string
}

export default function BrowserFrame({
  children,
  url = 'localhost:3000',
  title,
}: BrowserFrameProps) {
  return (
    <div className={styles.browser}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <span className={styles.dot} style={{ background: '#ff5f56' }} />
          <span className={styles.dot} style={{ background: '#ffbd2e' }} />
          <span className={styles.dot} style={{ background: '#27ca40' }} />
        </div>
        <div className={styles.addressBar}>
          <svg
            className={styles.lockIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className={styles.url}>{url}</span>
        </div>
        {title && <span className={styles.title}>{title}</span>}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
