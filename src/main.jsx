import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

const initialClasses = [
  { id: 'feed-controller', name: 'FeedController', file: 'src/controllers/FeedController.ts', language: 'TS', color: '#4d9de0', lines: '12–94', icon: '⌁', code: `export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly metrics: Metrics,
  ) {}

  async loadFeed(userId: string): Promise<Feed> {
    this.metrics.track('feed_load_started')

    const preferences = await this.feedService
      .getPreferences(userId)

    const items = await this.feedService.getItems({
      userId,
      topics: preferences.topics,
      limit: 30,
    })

    return Feed.from(items)
  }
}` },
  { id: 'feed-service', name: 'FeedService', file: 'src/services/FeedService.ts', language: 'TS', color: '#4d9de0', lines: '8–78', icon: '◇', code: `export class FeedService {
  constructor(private readonly repository: FeedRepository) {}

  async getItems(query: FeedQuery): Promise<FeedItem[]> {
    const cached = await this.repository.cache.get(query)
    if (cached) return cached

    const items = await this.repository.findMany({
      userId: query.userId,
      topics: query.topics,
      limit: query.limit,
    })

    await this.repository.cache.set(query, items)
    return items
  }
}` },
  { id: 'feed', name: 'Feed', file: 'src/models/Feed.ts', language: 'TS', color: '#4d9de0', lines: '4–55', icon: '○', code: `export class Feed {
  readonly items: readonly FeedItem[]

  private constructor(items: FeedItem[]) {
    this.items = items
  }

  static from(items: FeedItem[]): Feed {
    return new Feed(
      items
        .filter(item => !item.isHidden)
        .sort((a, b) => b.score - a.score),
    )
  }

  get isEmpty(): boolean {
    return this.items.length === 0
  }
}` },
  { id: 'feed-repository', name: 'FeedRepository', file: 'src/repositories/FeedRepository.ts', language: 'TS', color: '#4d9de0', lines: '10–101', icon: '▣', code: `export class FeedRepository {
  constructor(
    private readonly db: Database,
    public readonly cache: FeedCache,
  ) {}

  async findMany(params: FindFeedParams): Promise<FeedItem[]> {
    return this.db.feedItems.findMany({
      where: {
        userId: params.userId,
        topic: { in: params.topics },
      },
      orderBy: { score: 'desc' },
      take: params.limit,
    })
  }
}` },
  { id: 'feed-cache', name: 'FeedCache', file: 'src/cache/FeedCache.ts', language: 'TS', color: '#4d9de0', lines: '6–42', icon: '◈', code: `export class FeedCache {
  private readonly store = new Map<string, FeedItem[]>()

  async get(query: FeedQuery) {
    return this.store.get(this.key(query))
  }

  async set(query: FeedQuery, items: FeedItem[]) {
    this.store.set(this.key(query), items)
  }

  private key(query: FeedQuery) {
    return [query.userId, ...query.topics].join(':')
  }
}` },
  { id: 'feed-card', name: 'FeedCard', file: 'src/components/FeedCard.tsx', language: 'TSX', color: '#b577d9', lines: '16–86', icon: '▱', code: `export function FeedCard({ item }: FeedCardProps) {
  const { isSaved, toggleSaved } = useSavedItem(item.id)

  return (
    <article className="feed-card">
      <CardHeader topic={item.topic} />
      <CardTitle>{item.title}</CardTitle>
      <CardMeta author={item.author} />
      <CardActions
        isSaved={isSaved}
        onSave={toggleSaved}
      />
    </article>
  )
}` },
  { id: 'use-saved-item', name: 'useSavedItem', file: 'src/hooks/useSavedItem.ts', language: 'TS', color: '#4d9de0', lines: '5–37', icon: '⌘', code: `export function useSavedItem(itemId: string) {
  const [isSaved, setIsSaved] = useState(false)

  const toggleSaved = useCallback(async () => {
    setIsSaved(current => !current)
    await savedItems.toggle(itemId)
  }, [itemId])

  return { isSaved, toggleSaved }
}` },
]

function Icon({ children, className = '' }) { return <span className={`icon ${className}`}>{children}</span> }

function buildFileTree(files) {
  const root = { folders: new Map(), files: [] }
  files.forEach(file => {
    const path = file.webkitRelativePath || file.name
    const parts = path.split('/')
    let node = root
    parts.forEach((part, index) => {
      if (index === parts.length - 1) node.files.push({ name: part, path })
      else {
        if (!node.folders.has(part)) node.folders.set(part, { folders: new Map(), files: [] })
        node = node.folders.get(part)
      }
    })
  })
  return root
}

function FileSelectionTree({ files, selectedPaths, onToggle }) {
  const tree = buildFileTree(files)
  return <div className="file-picker-tree"><FileTreeNode node={tree} prefix="" selectedPaths={selectedPaths} onToggle={onToggle} /></div>
}

function FileTreeNode({ node, prefix, selectedPaths, onToggle }) {
  const folderEntries = [...node.folders.entries()]
  return <>{folderEntries.map(([name, child]) => {
    const folderPath = prefix ? `${prefix}/${name}` : name
    const descendants = collectTreePaths(child)
    const checked = descendants.length > 0 && descendants.every(path => selectedPaths.includes(path))
    return <div className="file-tree-folder" key={folderPath}><label className="file-picker-item folder-row"><input type="checkbox" checked={checked} onChange={() => onToggle(descendants, checked)} /><span className="folder-icon">◆</span><span>{name}</span></label><div className="file-tree-children"><FileTreeNode node={child} prefix={folderPath} selectedPaths={selectedPaths} onToggle={onToggle} /></div></div>
  })}{node.files.map(file => <label className="file-picker-item file-row" key={file.path}><input type="checkbox" checked={selectedPaths.includes(file.path)} onChange={() => onToggle([file.path], selectedPaths.includes(file.path))} /><span>◇</span><span>{file.name}</span></label>)}</>
}

function collectTreePaths(node) {
  return [...node.files.map(file => file.path), ...[...node.folders.entries()].flatMap(([name, child]) => collectTreePaths(child))]
}

function saveDirectoryHandle(handle) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('multiclass-editor', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => {
      const transaction = request.result.transaction('settings', 'readwrite')
      transaction.objectStore('settings').put(handle, 'directory')
      transaction.oncomplete = resolve
      transaction.onerror = reject
    }
    request.onerror = reject
  })
}

function loadDirectoryHandle() {
  return new Promise(resolve => {
    const request = indexedDB.open('multiclass-editor', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => {
      const transaction = request.result.transaction('settings', 'readonly')
      const get = transaction.objectStore('settings').get('directory')
      get.onsuccess = () => resolve(get.result || null)
      get.onerror = () => resolve(null)
    }
    request.onerror = () => resolve(null)
  })
}

function savePreferences(preferences) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('multiclass-editor', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => {
      const transaction = request.result.transaction('settings', 'readwrite')
      transaction.objectStore('settings').put(preferences, 'preferences')
      transaction.oncomplete = resolve
      transaction.onerror = reject
    }
    request.onerror = reject
  })
}

function loadPreferences() {
  return new Promise(resolve => {
    const request = indexedDB.open('multiclass-editor', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => {
      const get = request.result.transaction('settings', 'readonly').objectStore('settings').get('preferences')
      get.onsuccess = () => resolve(get.result || null)
      get.onerror = () => resolve(null)
    }
    request.onerror = () => resolve(null)
  })
}

async function scanRememberedDirectory(directory) {
  const collected = []
  const ignorePatterns = ['node_modules/', '.git/', 'dist/', 'build/']
  try {
    const ignoreFile = await directory.getFileHandle('.gitignore')
    const ignoreText = await (await ignoreFile.getFile()).text()
    ignoreText.split(/\r?\n/).forEach(line => {
      const rule = line.trim()
      if (rule && !rule.startsWith('#')) ignorePatterns.push(rule)
    })
  } catch {}
  const matchesIgnore = path => ignorePatterns.some(rule => {
    const normalized = rule.replace(/^!/, '').replace(/^\//, '').replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
    return new RegExp(rule.includes('/') ? `^${normalized}(?:/|$)` : `(?:^|/)${normalized}(?:/|$)`).test(path)
  })
  async function collect(handle, path = '') {
    for await (const entry of handle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name
      if (matchesIgnore(`${entryPath}/`)) continue
      if (entry.kind === 'file' && /\.(js|jsx|ts|tsx|java|kt|py|cs|go|rs|php|rb|swift|vue|svelte)$/i.test(entry.name) && !matchesIgnore(entryPath)) {
        const file = await entry.getFile()
        Object.defineProperty(file, 'webkitRelativePath', { value: entryPath })
        collected.push(file)
      } else if (entry.kind === 'directory') await collect(entry, entryPath)
    }
  }
  await collect(directory)
  return collected
}

function App() {
  const [classes, setClasses] = useState([])
  const [openIds, setOpenIds] = useState([])
  const [activeId, setActiveId] = useState('')
  const [query, setQuery] = useState('')
  const [columns, setColumns] = useState(4)
  const [denseGrid, setDenseGrid] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [cardHeight, setCardHeight] = useState(360)
  const [fontSize, setFontSize] = useState(9)
  const [includeFunctions, setIncludeFunctions] = useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filePickerOpen, setFilePickerOpen] = useState(true)
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false)
  const [availableFiles, setAvailableFiles] = useState([])
  const [selectedPaths, setSelectedPaths] = useState([])
  const [folderName, setFolderName] = useState('')
  const [agentProjectRoot, setAgentProjectRoot] = useState('')
  const [agentProjectName, setAgentProjectName] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [showDependencies, setShowDependencies] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => {
    fetch('http://127.0.0.1:4317/health').then(response => response.ok ? response.json() : null).then(data => {
      if (!data?.projectRoot) return
      const projectPath = data.projectRoot.replaceAll('\\', '/')
      setAgentProjectRoot(data.projectRoot)
      setAgentProjectName(projectPath.split('/').filter(Boolean).pop() || '')
      setFolderName(projectPath.split('/').filter(Boolean).pop() || '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadDirectoryHandle().then(async handle => {
      if (!handle) return
      setFolderName(handle.name)
      try {
        const permission = await handle.queryPermission({ mode: 'read' })
        if (permission === 'granted') {
          const files = await scanRememberedDirectory(handle)
          setAvailableFiles(files)
          setSelectedPaths(files.map(file => file.webkitRelativePath || file.name))
          addFiles(files)
        }
      } catch {
        // The browser may require the user to choose the folder again.
      }
    })
  }, [])

  useEffect(() => {
    loadPreferences().then(preferences => {
      if (preferences) {
        if (preferences.cardHeight || preferences.rowHeight) setCardHeight(preferences.cardHeight || preferences.rowHeight)
        if (preferences.fontSize) setFontSize(preferences.fontSize)
        if (preferences.columns) setColumns(preferences.columns)
        if (typeof preferences.denseGrid === 'boolean') setDenseGrid(preferences.denseGrid)
        if (typeof preferences.includeFunctions === 'boolean') setIncludeFunctions(preferences.includeFunctions)
      }
      setPreferencesLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (preferencesLoaded) savePreferences({ cardHeight, fontSize, columns, denseGrid, includeFunctions })
  }, [preferencesLoaded, cardHeight, fontSize, columns, denseGrid, includeFunctions])

  const visibleClasses = useMemo(() => classes.filter(c => `${c.name} ${c.file}`.toLowerCase().includes(query.toLowerCase())), [classes, query])
  const visibleFiles = useMemo(() => availableFiles.filter(file => (file.webkitRelativePath || file.name).toLowerCase().includes(query.toLowerCase())), [availableFiles, query])
  const openClasses = openIds.map(id => classes.find(c => c.id === id)).filter(Boolean)
  const openGroups = useMemo(() => {
    const groups = new Map()
    openClasses.filter(item => `${item.name} ${item.file}`.toLowerCase().includes(query.toLowerCase())).forEach(item => {
      if (!groups.has(item.file)) groups.set(item.file, [])
      groups.get(item.file).push(item)
    })
    return [...groups.entries()].map(([file, items]) => ({ file, items }))
  }, [openIds, classes, query])
  const fileGroups = useMemo(() => {
    const groups = new Map()
    visibleClasses.forEach(item => {
      const parts = item.file.split(/[\\/]/)
      const label = parts.length > 1 ? parts[parts.length - 2] : 'project files'
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(item)
    })
    return [...groups.entries()].map(([label, children]) => ({ label, children }))
  }, [visibleClasses])
  const dependencyLinks = useMemo(() => {
    const links = []
    classes.forEach(source => {
      classes.forEach(target => {
        if (source.id === target.id) return
        const targetBase = target.file.split(/[\\/]/).pop().replace(/\.[^.]+$/, '').toLowerCase()
        const importsTarget = new RegExp(`(?:from|require\\s*\\()\\s*["'][^"']*${targetBase}(?:\\.[^"']+)?["']`, 'i').test(source.code)
        const referencesTarget = new RegExp(`\\b${target.name}\\b`).test(source.code)
        if (importsTarget || referencesTarget) links.push({ source, target, reason: importsTarget ? 'import' : 'usage' })
      })
    })
    return links
  }, [classes])

  function openClass(id) {
    setOpenIds(ids => ids.includes(id) ? ids : [...ids, id])
    setActiveId(id)
  }
  function closeClass(id) {
    setOpenIds(ids => ids.filter(item => item !== id))
    if (activeId === id) setActiveId(openIds.find(item => item !== id) || '')
  }
  function updateCardHeight(value) {
    setCardHeight(value)
  }
  function updateFontSize(delta) {
    const next = Math.max(7, Math.min(16, fontSize + delta))
    setFontSize(next)
  }
  function runCommand(rawCommand) {
    const command = rawCommand.replace(/^>/, '').trim().toLowerCase()
    if (command === 'clear' || command === 'clear all') setOpenIds([])
    else if (command === 'dependencies' || command === 'deps') setShowDependencies(true)
    else if (command === 'settings') setShowSettings(true)
    else if (command === 'open' || command === 'open folder' || command === 'folder') pickFolder()
    else if (command === 'dense') setDenseGrid(true)
    else if (command === 'normal') setDenseGrid(false)
    else if (command.startsWith('columns ')) {
      const count = Number(command.replace('columns ', ''))
      if ([2, 3, 4, 5, 6].includes(count)) setColumns(count)
    }
    setQuery('')
  }
  async function openNativeFile(item) {
    try {
      const response = await fetch('http://127.0.0.1:4317/open-file', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: item.file, line: Number(item.lines.split('–')[0]) }) })
      if (!response.ok) throw new Error('Agent unavailable')
    } catch {
      setActionDrawerOpen(true)
    }
  }
  function startSidebarResize(event) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const move = moveEvent => setSidebarWidth(Math.max(190, Math.min(420, startWidth + moveEvent.clientX - startX)))
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
  }
  function extractClassBlocks(source, includeFunctions = false) {
    const declarations = /(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)[^\{]*\{/g
    const blocks = []
    let match
    while ((match = declarations.exec(source))) {
      const openBrace = declarations.lastIndex - 1
      let depth = 0
      let quote = ''
      let escaped = false
      const nextDeclarationOffset = source.slice(openBrace + 1).search(/(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+[A-Za-z_$][\w$]*[^\{]*\{/)
      const scanLimit = nextDeclarationOffset === -1 ? source.length : openBrace + 1 + nextDeclarationOffset
      let end = scanLimit
      for (let index = openBrace; index < scanLimit; index += 1) {
        const character = source[index]
        if (quote) {
          if (escaped) escaped = false
          else if (character === '\\') escaped = true
          else if (character === quote) quote = ''
          continue
        }
        if (character === '"' || character === "'" || character === '`') {
          quote = character
          continue
        }
        if (character === '{') depth += 1
        if (character === '}') {
          depth -= 1
          if (depth === 0) {
            end = index + 1
            break
          }
        }
      }
      blocks.push({ name: match[1], kind: 'class', code: source.slice(match.index, end), start: match.index, end })
    }
    if (includeFunctions) {
      const functionDeclarations = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g
      let functionMatch
      while ((functionMatch = functionDeclarations.exec(source))) {
        const openBrace = functionDeclarations.lastIndex - 1
        let depth = 0
        let quote = ''
        let escaped = false
        let end = source.length
        for (let index = openBrace; index < source.length; index += 1) {
          const character = source[index]
          if (quote) {
            if (escaped) escaped = false
            else if (character === '\\') escaped = true
            else if (character === quote) quote = ''
            continue
          }
          if (character === '"' || character === "'" || character === '`') { quote = character; continue }
          if (character === '{') depth += 1
          if (character === '}' && --depth === 0) { end = index + 1; break }
        }
        blocks.push({ name: functionMatch[1], kind: 'function', code: source.slice(functionMatch.index, end), start: functionMatch.index, end })
      }
    }
    return blocks
  }

  function addFiles(fileList) {
    Array.from(fileList || []).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const source = String(reader.result || '')
        const blocks = extractClassBlocks(source, includeFunctions)
        const filePath = file.webkitRelativePath || file.name
        const language = file.name.split('.').pop().toUpperCase()
        const imported = blocks.map(block => {
          const id = `${filePath}-${block.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          const startLine = source.slice(0, block.start).split('\n').length
          const endLine = startLine + block.code.split('\n').length - 1
          return { id, name: block.name, file: filePath, language, color: block.kind === 'function' ? '#d6a36b' : language === 'TSX' || language === 'JSX' ? '#b577d9' : '#4d9de0', lines: `${startLine}–${endLine}`, icon: block.kind === 'function' ? 'ƒ' : '◇', code: block.code }
        })
        if (!imported.length) return
        setClasses(current => [...current, ...imported.filter(item => !current.some(existing => existing.id === item.id))])
        imported.forEach(item => openClass(item.id))
      }
      reader.readAsText(file)
    })
  }
  function loadSelectedFiles() {
    setClasses([])
    setOpenIds([])
    setActiveId('')
    addFiles(availableFiles.filter(file => selectedPaths.includes(file.webkitRelativePath || file.name)))
  }
  async function pickFolder() {
    if (!window.showDirectoryPicker) {
      fileInput.current?.click()
      return
    }
    try {
      const directory = await window.showDirectoryPicker({ mode: 'read' })
      setFolderName(directory.name)
      await saveDirectoryHandle(directory)
      const collected = []
      const ignorePatterns = ['node_modules/', '.git/', 'dist/', 'build/']
      try {
        const ignoreFile = await directory.getFileHandle('.gitignore')
        const ignoreText = await (await ignoreFile.getFile()).text()
        ignoreText.split(/\r?\n/).forEach(line => {
          const rule = line.trim()
          if (rule && !rule.startsWith('#')) ignorePatterns.push(rule)
        })
      } catch {
        // A project is allowed not to have a .gitignore file.
      }
      function matchesIgnore(path) {
        let ignored = false
        ignorePatterns.forEach(rawRule => {
          let rule = rawRule.trim()
          if (!rule) return
          const negated = rule.startsWith('!')
          if (negated) rule = rule.slice(1)
          const directoryRule = rule.endsWith('/')
          rule = rule.replace(/^\//, '').replace(/\/$/, '')
          const escaped = rule.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')
          const expression = rule.includes('/') ? `^${escaped}${directoryRule ? '(?:/|$)' : '$'}` : `(?:^|/)${escaped}${directoryRule ? '(?:/|$)' : '$'}`
          if (new RegExp(expression).test(path)) ignored = !negated
        })
        return ignored
      }
      async function collectFiles(handle, path = '') {
        for await (const entry of handle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name
          if (matchesIgnore(`${entryPath}/`)) continue
          if (entry.kind === 'file' && /\.(js|jsx|ts|tsx|java|kt|py|cs|go|rs|php|rb|swift|vue|svelte)$/i.test(entry.name) && !matchesIgnore(entryPath)) {
            const file = await entry.getFile()
            Object.defineProperty(file, 'webkitRelativePath', { value: entryPath })
            collected.push(file)
          } else if (entry.kind === 'directory') {
            await collectFiles(entry, entryPath)
          }
        }
      }
      await collectFiles(directory)
      setAvailableFiles(collected)
      setSelectedPaths(collected.map(file => file.webkitRelativePath || file.name))
    } catch (error) {
      if (error?.name !== 'AbortError') console.error('Could not read folder', error)
    }
  }

  return <div className="app-shell" style={{ '--editor-font-size': `${fontSize}px` }}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><span>multiclass</span></div>
      <div className="project-path"><Icon>⌁</Icon><span>{folderName || 'No folder selected'}</span><Icon>⌄</Icon></div>
      <div className="top-actions"><button className="icon-button" title="Settings" onClick={() => setShowSettings(value => !value)}>⚙</button></div>{showSettings && <div className="settings-popover"><strong>View settings</strong><label>Card height <span className="range-value">{cardHeight}px</span><input className="range-input" type="range" min="180" max="600" step="20" value={cardHeight} onChange={event => updateCardHeight(Number(event.target.value))} /></label><label className="font-setting">Code font size<div className="font-stepper"><button onClick={() => updateFontSize(-1)}>−</button><span>{fontSize}px</span><button onClick={() => updateFontSize(1)}>＋</button></div></label><div className="grid-setting"><span>Grid columns</span><div>{[2, 3, 4, 5, 6].map(count => <button key={count} className={columns === count ? 'selected' : ''} onClick={() => setColumns(count)}>{count}</button>)}</div></div><label className="function-setting"><input type="checkbox" checked={includeFunctions} onChange={event => setIncludeFunctions(event.target.checked)} /> Include functions</label><label className="function-setting"><input type="checkbox" checked={denseGrid} onChange={event => setDenseGrid(event.target.checked)} /> Dense grid</label></div>}
    </header>

    <div className="workspace">
      <div className="left-rail"><button title="Show or hide explorer" onClick={() => setSidebarCollapsed(value => !value)}>☰</button></div>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ width: sidebarCollapsed ? 0 : sidebarWidth, flexBasis: sidebarCollapsed ? 0 : sidebarWidth }}>
        <div className="sidebar-brand"><div className="brand-mark"><span></span><span></span><span></span></div><span>multiclass</span></div><div className="project-context" title={agentProjectRoot || folderName}><strong>{agentProjectName || folderName || 'No project selected'}</strong><small>{agentProjectRoot || 'Start the local agent to show the full path'}</small></div>
        <div className="sidebar-heading"><span>PROJECT</span><button className="plain-button" title="Open local folder" onClick={pickFolder}>＋</button><input ref={fileInput} type="file" webkitdirectory="true" directory="true" multiple hidden onChange={e => { const files = Array.from(e.target.files || []); setAvailableFiles(files); setSelectedPaths(files.map(file => file.webkitRelativePath || file.name)) }} /></div>
        {availableFiles.length > 0 && <div className="file-picker"><div className="file-picker-head"><span>FILES TO SCAN</span><div><button onClick={() => setSelectedPaths(selectedPaths.length === availableFiles.length ? [] : availableFiles.map(file => file.webkitRelativePath || file.name))}>{selectedPaths.length === availableFiles.length ? 'Clear' : 'All'}</button><button className="file-picker-toggle" title="Collapse file picker" onClick={() => setFilePickerOpen(value => !value)}>{filePickerOpen ? '⌃' : '⌄'}</button></div></div>{filePickerOpen && <><FileSelectionTree files={visibleFiles} selectedPaths={selectedPaths} onToggle={(paths, checked) => setSelectedPaths(current => checked ? current.filter(path => !paths.includes(path)) : [...new Set([...current, ...paths])])} /><button className="scan-button" onClick={loadSelectedFiles}>Show classes from {selectedPaths.length} files</button></>}</div>}
        <div className="sidebar-footer"><div><span className="status-dot"></span> {openIds.length} classes open</div><span className="muted">v0.1.0</span></div><div className="sidebar-resizer" onMouseDown={startSidebarResize} />
      </aside>

      <main className="main-content">
        <div className={`action-drawer ${actionDrawerOpen ? 'open' : ''}`}><button className="action-rail-toggle" title="Actions" onClick={() => setActionDrawerOpen(value => !value)}>{actionDrawerOpen ? '›' : '⋮'}</button>{actionDrawerOpen && <div className="action-drawer-content"><strong>Actions</strong><button onClick={() => setShowSettings(value => !value)}>⚙ <span>Settings</span></button><button onClick={() => setShowDependencies(value => !value)}>↗ <span>Dependencies {dependencyLinks.length}</span></button><button onClick={() => setOpenIds([])}>× <span>Clear all</span></button><button onClick={pickFolder}>＋ <span>Open folder</span></button></div>}</div>
        <div className={`floating-search ${query.startsWith('>') ? 'command-mode' : ''}`}><Icon>{query.startsWith('>') ? '›' : '⌕'}</Icon><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={event => { if (event.key === 'Enter' && query.startsWith('>')) runCommand(query) }} placeholder={query.startsWith('>') ? '> command...' : 'Find a class or file...'} /><kbd>⌘ K</kbd>{query.startsWith('>') && <div className="command-suggestions"><button onClick={() => runCommand('>open folder')}><b>&gt; open folder</b><span>Choose a local directory</span></button><button onClick={() => runCommand('>dependencies')}><b>&gt; dependencies</b><span>Show dependency tree</span></button><button onClick={() => runCommand('>settings')}><b>&gt; settings</b><span>Open view settings</span></button><button onClick={() => runCommand('>clear')}><b>&gt; clear</b><span>Close all cards</span></button><button onClick={() => runCommand('>columns 4')}><b>&gt; columns 4</b><span>Set grid columns</span></button></div>}</div>
        {showDependencies && <DependencyPanel links={dependencyLinks} onClose={() => setShowDependencies(false)} />}
        <section className={`grid grouped-grid ${denseGrid ? 'dense' : ''}`} style={{'--card-height': `${cardHeight}px`}}>{openGroups.map(group => <div className="class-group" key={group.file}><div className="class-group-head"><span className="folder-icon">◆</span><strong>{group.file}</strong><span>{group.items.length} items</span></div><div className="class-group-grid" style={{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}}>{group.items.map(item => <ClassCard key={item.id} item={item} active={activeId === item.id} onActivate={() => setActiveId(item.id)} onExpand={() => setExpandedId(item.id)} onOpenFile={() => openNativeFile(item)} />)}</div></div>)}{openClasses.length === 0 && <div className="empty-state"><div className="empty-icon">＋</div><h2>Your workspace is clear</h2><p>Pick a class from the project tree or open a local folder to start mapping your code.</p><button className="primary-button" onClick={pickFolder}>Open folder</button></div>}</section>
        <div className="statusbar"><span><span className="status-dot"></span> Workspace synced</span><span>{openClasses.length} of {classes.length} classes · {visibleClasses.length} matching search</span><span>UTF-8 <b>⌄</b></span></div>
        {expandedId && <ClassDialog item={classes.find(item => item.id === expandedId)} onClose={() => setExpandedId('')} />}
      </main>
    </div>
  </div>
}

function ClassCard({ item, active, onActivate, onExpand, onOpenFile }) {
  const lines = item.code.split('\n')
  return <article className={`class-card ${active ? 'focused' : ''}`} onClick={onActivate}>
    <div className="card-head"><div className="class-title"><span className="class-icon" style={{background: item.color + '18', color: item.color}}>{item.icon}</span><div><h2>{item.name}</h2><p>{item.file}</p></div></div><button className="more-button" title="Enlarge class" onClick={event => { event.stopPropagation(); onExpand() }}>⤢</button></div>
    <div className="code-wrap"><pre><code>{lines.map((line, i) => <span key={i} className="code-line">{highlight(line)}</span>)}</code></pre></div>
    <div className="card-foot"><span><span className="lang-dot" style={{background:item.color}}></span>{item.language} · {item.lines}</span><button className="card-link" onClick={event => { event.stopPropagation(); onOpenFile() }}>Open file ↗</button></div>
  </article>
}

function ClassDialog({ item, onClose }) {
  if (!item) return null
  return <div className="dialog-backdrop" onClick={onClose}><section className="class-dialog" onClick={event => event.stopPropagation()}><div className="dialog-head"><div><h2>{item.name}</h2><p>{item.file} · {item.language} · lines {item.lines}</p></div><button className="dialog-close" onClick={onClose}>×</button></div><div className="dialog-code"><pre><code>{item.code.split('\n').map((line, index) => <span key={index} className="code-line">{highlight(line)}</span>)}</code></pre></div></section></div>
}

function DependencyPanel({ links, onClose }) {
  const grouped = [...links.reduce((map, link) => {
    if (!map.has(link.source.id)) map.set(link.source.id, { source: link.source, targets: [] })
    map.get(link.source.id).targets.push(link)
    return map
  }, new Map()).values()]
  return <section className="dependency-panel"><div className="dependency-heading"><div><strong>Dependency tree</strong><span>Detected from imports and class references</span></div><div className="dependency-heading-actions"><span className="dependency-count">{links.length} relations</span><button className="drawer-close" title="Close dependencies" onClick={onClose}>×</button></div></div>{links.length === 0 ? <p className="dependency-empty">Load related classes from the same project to see connections.</p> : <div className="dependency-tree">{grouped.map(group => <div className="dependency-node" key={group.source.id}><div className="dependency-parent"><span className="tree-branch">⌄</span><span className="dependency-class">{group.source.name}</span><small>{group.source.file}</small></div><div className="dependency-children">{group.targets.map((link, index) => <div className="dependency-child" key={`${link.target.id}-${index}`}><span className="tree-branch">└─</span><span className="dependency-class target">{link.target.name}</span><span className="dependency-reason">{link.reason}</span></div>)}</div></div>)}</div>}</section>
}

function highlight(line) {
  const tokenPattern = /(\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:export|class|constructor|private|readonly|async|return|const|new|static|public|await|interface|function|true|false|null|undefined|this|extends|implements|import|from|as|if|else|for|while|try|catch|throw)\b|\b[A-Z][A-Za-z0-9_$]*\b|\b\d+(?:\.\d+)?\b)/g
  return line.split(tokenPattern).map((part, i) => {
    if (!part) return null
    let className = ''
    if (part.startsWith('//')) className = 'comment'
    else if (/^("|'|`)/.test(part)) className = 'string'
    else if (/^(?:export|class|constructor|private|readonly|async|return|const|new|static|public|await|interface|function|true|false|null|undefined|this|extends|implements|import|from|as|if|else|for|while|try|catch|throw)$/.test(part)) className = 'kw'
    else if (/^[A-Z][A-Za-z0-9_$]*$/.test(part)) className = 'type'
    else if (/^\d/.test(part)) className = 'number'
    return className ? <span className={className} key={i}>{part}</span> : part
  })
}

createRoot(document.getElementById('root')).render(<App />)
