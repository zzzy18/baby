import { useState } from 'react'
import './App.css'
import FeedingLog from './components/FeedingLog'
import DiaperLog from './components/DiaperLog'
import SleepLog from './components/SleepLog'
import MilkStorage from './components/MilkStorage'

const TABS = [
  { key: 'feeding', label: '喂奶', icon: '🍼', title: '喂奶记录', subtitle: '追踪宝宝每次进食' },
  { key: 'diaper', label: '尿布', icon: '💧', title: '换尿布', subtitle: '记录大小便情况' },
  { key: 'sleep', label: '睡眠', icon: '😴', title: '睡眠记录', subtitle: '分析宝宝睡眠规律' },
  { key: 'milk', label: '母乳', icon: '🥛', title: '母乳存储', subtitle: '管理库存与有效期' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('feeding')

  const currentTab = TABS.find(t => t.key === activeTab)

  function renderContent() {
    switch (activeTab) {
      case 'feeding': return <FeedingLog />
      case 'diaper': return <DiaperLog />
      case 'sleep': return <SleepLog />
      case 'milk': return <MilkStorage />
      default: return null
    }
  }

  return (
    <>
      {/* 顶部标题 */}
      <div className="top-bar">
        <h1>{currentTab.icon} {currentTab.title}</h1>
        <div className="subtitle">{currentTab.subtitle}</div>
      </div>

      {/* 主内容 */}
      <div className="main-content">
        {renderContent()}
      </div>

      {/* 底部导航 */}
      <nav className="bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
