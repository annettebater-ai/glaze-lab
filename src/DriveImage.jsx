import { useState, useEffect } from 'react'

export default function DriveImage({ fileId, accessToken, alt, className, style }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!fileId || !accessToken) return
    let objectUrl = null

    fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => setError(true))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId, accessToken])

  if (error || !fileId) {
    return (
      <div className={className} style={{
        ...style,
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        🏺
      </div>
    )
  }

  if (!src) {
    return (
      <div className={className} style={{
        ...style,
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#888'
      }}>
        ...
      </div>
    )
  }

  return <img src={src} alt={alt || ''} className={className} style={style} />
}