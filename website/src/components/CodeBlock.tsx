import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import styles from './CodeBlock.module.css'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
}

export default function CodeBlock({
  code,
  language = 'tsx',
  filename,
  showLineNumbers = true,
}: CodeBlockProps) {
  return (
    <div className={styles.codeBlock}>
      {filename && (
        <div className={styles.header}>
          <div className={styles.dots}>
            <span className={styles.dot} style={{ background: '#ff5f56' }} />
            <span className={styles.dot} style={{ background: '#ffbd2e' }} />
            <span className={styles.dot} style={{ background: '#27ca40' }} />
          </div>
          <span className={styles.filename}>{filename}</span>
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers={showLineNumbers}
        wrapLines
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#1e1e1e',
          fontSize: '0.875rem',
          borderRadius: filename ? '0 0 8px 8px' : '8px',
        }}
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: '#6e7681',
          userSelect: 'none',
        }}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  )
}
