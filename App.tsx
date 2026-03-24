import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Database, 
    SearchX, 
    Search, 
    Upload, 
    Download, 
    ShieldCheck, 
    ListFilter, 
    AlertTriangle, 
    Activity, 
    Settings, 
    ClipboardList, 
    Archive, 
    Copy, 
    Hourglass, 
    Play, 
    LayoutGrid, 
    Repeat, 
    ShieldAlert,
    Lock,
    Clock,
    CheckCircle,
    Info,
    X,
    Shield,
    UserCheck,
    UserX,
    Bell,
    LogOut,
    User as UserIcon
} from 'lucide-react';
import { User, ONTRecord, ONTStatus, FilterState, KPIStats } from './types';
import { dbService } from './services/dbService';
import { soundService } from './services/soundService';
import { parseNokiaFile, parseExcelFile, exportToExcel } from './services/excelService';
import { extractNokiaDataFromImage } from './services/ocrService';
import LoginForm from './components/LoginForm';
import SettingsPanel from './components/SettingsPanel';
import DataTable from './components/DataTable';
import SearchDialog from './components/SearchDialog';
import AboutDialog from './components/AboutDialog';
import ReadmeDialog from './components/ReadmeDialog';
import LisezMoiDialog from './components/LisezMoiDialog';
import MessageDialog from './components/MessageDialog';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SectionHeader from './components/SectionHeader';
import StatsGrid from './components/StatsGrid';
import MassiveSearch from './components/MassiveSearch';
import ActionBar from './components/ActionBar';
import ActiveFilters from './components/ActiveFilters';
import TechStatsDialog from './components/TechStatsDialog'; // IMPORT NEW DIALOG
import AdminPanel from './components/AdminPanel'; // IMPORT ADMIN PANEL
import LogsPanel from './components/LogsPanel';
import PasswordDialog from './components/PasswordDialog'; // IMPORT PASSWORD DIALOG
import { DigitalDisplay } from './components/DigitalDisplay';
import { useNotification } from '@/components/NotificationProvider';
import LoadingOverlay from './components/LoadingOverlay';
import { API_BASE_URL } from './config';

const DEMO_DATA: ONTRecord[] = [
    //{ id: 'demo-1', msan: '100737066', version: '26ABID', location: '1321/1 OMO HAS2', sn: 'ALCLB46C99A4', vendorId: 'ALCL', status: 'critical' },
];

const App: React.FC = () => {
  const { addNotification } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [loginTime, setLoginTime] = useState<Date | null>(null);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isUserPending, setIsUserPending] = useState(false);
  const [connectedUsersCount, setConnectedUsersCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [data, setData] = useState<ONTRecord[]>([]);
  const [data2, setData2] = useState<ONTRecord[]>([]); // NEW: Data for Recherche simple 2
  const [recapData, setRecapData] = useState<ONTRecord[]>([]); // New Recap State
  const [archiveData, setArchiveData] = useState<ONTRecord[]>([]); // New Archive State
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<number | undefined>(undefined);
  const [lastImportDate, setLastImportDate] = useState<string | null>(null);
  const [lastServerUpdate, setLastServerUpdate] = useState<string | null>(null);
  const [lastImportDate2, setLastImportDate2] = useState<string | null>(null); // NEW: Import date for dashboard2
  const [modalConfig, setModalConfig] = useState<{ results: ONTRecord[], title: string } | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [showLisezMoi, setShowLisezMoi] = useState(false);
  const [showRepeatedInfo, setShowRepeatedInfo] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean, title: string, message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ 
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void,
    confirmLabel?: string,
    cancelLabel?: string
  } | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAdminPasswordDialog, setShowAdminPasswordDialog] = useState(false); // NEW: Admin Password Dialog State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false); // NEW: Admin Unlock State
  const [pendingAdminTab, setPendingAdminTab] = useState<string | null>(null); // NEW: Pending Admin Tab State
  const [isSessionInvalid, setIsSessionInvalid] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false); // NEW: Approval Success State
  
  // Tech Stats State
  const [showTechStats, setShowTechStats] = useState(false);
  const [techStats, setTechStats] = useState({ total: 0, huawei: 0, nokia: 0, others: 0, found: 0, rack0: 0, rack1: 0 });

  // Sidebar state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarToggleTrigger, setSidebarToggleTrigger] = useState(0);

  // New State for Ont Trouves Clicked
  const [isOntTrouvesClicked, setIsOntTrouvesClicked] = useState(false);
  
  // Animation key for StatsGrid
  const [statsKey, setStatsKey] = useState(0);
  
  // New State for Archiving Duplicates Count
  const [lastRepeatedCount, setLastRepeatedCount] = useState(0);
  const [repeatedRecords, setRepeatedRecords] = useState<ONTRecord[]>([]); // Store actual duplicates
  const [massiveRepeatedCount, setMassiveRepeatedCount] = useState(0); // Store count of duplicates found in massive search
  const [massiveRepeatedRecords, setMassiveRepeatedRecords] = useState<ONTRecord[]>([]); // Store actual duplicates from massive search

  const [filters, setFilters] = useState<FilterState>({
    sn: '',
    location: '', 
    msan: '',
    status: null,
    showRepeated: false,
    massiveSns: [],
    waitingSns: []
  });

  const [filters2, setFilters2] = useState<FilterState>({ // NEW: Filters for Recherche simple 2
    sn: '',
    location: '', 
    msan: '',
    status: null,
    showRepeated: false,
    massiveSns: [],
    waitingSns: []
  });

  // INITIALIZATION: Load session and saved data
  useEffect(() => {
    const savedUser = dbService.getCurrentUser();
    if (savedUser) {
        setUser(savedUser);
        // Check status from server
        dbService.checkUserStatus(savedUser.username, savedUser.sessionId).then(({ status, sessionValid }) => {
            if (!sessionValid) {
                setIsSessionInvalid(true);
            } else if (status === 'blocked') {
                setIsUserBlocked(true);
            } else if (status === 'pending') {
                setIsUserPending(true);
            }
        });
    }

    const loadData = async () => {
      const savedData = await dbService.getONTData();
      if (savedData.records.length > 0) {
        const hasDemoData = savedData.records.some(r => r.sn === 'ALCLB46C99A4');
        if (!hasDemoData) {
            const mergedData = [...DEMO_DATA, ...savedData.records];
            setData(mergedData);
        } else {
            setData(savedData.records);
        }

        if (savedData.lastUpdated) {
          setLastImportDate(savedData.lastUpdated);
        }
      } else {
          setData(DEMO_DATA);
          await dbService.saveONTData(DEMO_DATA);
      }

      // Load Huawei server update time
      try {
        const huaweiData = await dbService.getHuaweiData();
        if (huaweiData.lastUpdated) {
          setLastServerUpdate(huaweiData.lastUpdated);
        }
      } catch (e) {
        console.error("Error loading Huawei server update time:", e);
      }
    };
    
    loadData();
  }, []);

  // Polling for user stats (connected and pending users)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/stats`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConnectedUsersCount(data.connectedUsers);
            setPendingUsersCount(data.pendingUsers);
          }
        }
      } catch (err) {
        console.error("Error fetching user stats:", err);
      }
    };

    fetchStats();
  }, []);

  // Polling for user status to handle real-time blocking and approval
  useEffect(() => {
    if (!user) return;

    let errorCount = 0;
    
    const checkStatus = async () => {
      try {
        const { status, sessionValid } = await dbService.checkUserStatus(user.username, user.sessionId);
        errorCount = 0; // Reset on success
        
        if (!sessionValid) {
          setIsSessionInvalid(true);
          soundService.playError();
          return;
        }

        if (status === 'blocked') {
          if (!isUserBlocked) {
            setIsUserBlocked(true);
            setIsUserPending(false);
            soundService.playError();
          }
        } else if (status === 'pending') {
          if (!isUserPending) {
            setIsUserPending(true);
            setIsUserBlocked(false);
          }
        } else if (status === 'active') {
          if (isUserPending) {
            // TRANSITION: Pending -> Active (Approved!)
            setIsUserPending(false);
            setShowApprovalSuccess(true);
            soundService.playSuccess();
          }
          if (isUserBlocked) {
            setIsUserBlocked(false);
          }
        }
      } catch (err) {
        console.error("Status check failed:", err);
        errorCount++;
      }
    };

    // Dynamic interval: back off if errors occur
    let interval: any;
    const runCheck = () => {
      interval = setTimeout(async () => {
        await checkStatus();
        runCheck();
      }, errorCount > 3 ? 60000 : 5000);
    };
    
    runCheck();
    
    return () => clearTimeout(interval);
  }, [user, isUserBlocked, isUserPending]);

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Administrateur' || user?.role === 'Admin';
  const isUserActive = !isUserBlocked && !isUserPending;

  // Heartbeat and Stats Polling
  const fetchStats = useCallback(async () => {
    if (!user || (!isUserActive && !isAdmin)) return;
    if (user.role === 'Super Admin' || user.role === 'Administrateur') {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/stats`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConnectedUsersCount(data.connectedUsers);
            setPendingUsersCount(data.pendingUsers);
          }
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
    }
  }, [user, isUserBlocked, isUserPending]);

  useEffect(() => {
    if (!user || (!isUserActive && !isAdmin)) return;

    let errorCount = 0;
    
    const sendHeartbeat = async () => {
      try {
        // Send heartbeat
        const response = await fetch(`${API_BASE_URL}/api/users/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, sessionId: user.sessionId })
        });
        
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.sessionValid === false) {
              setIsSessionInvalid(true);
              soundService.playError();
            }
            errorCount = 0; // Reset error count on success
          } else {
            const text = await response.text();
            console.warn("Heartbeat received non-JSON response:", text.substring(0, 100));
            errorCount++;
          }
        } else {
          console.warn(`Heartbeat response not OK: ${response.status}`);
          errorCount++;
        }
      } catch (err) {
        console.error("Heartbeat error:", err);
        errorCount++;
      }
    };

    sendHeartbeat();
    fetchStats();
    
    // Dynamic interval: if errors occur, back off to 60 seconds to prevent circuit breaker issues
    const getInterval = () => errorCount > 3 ? 60000 : 5000;
    
    let heartbeatInterval: any;
    
    const runIntervals = () => {
      heartbeatInterval = setTimeout(async () => {
        await sendHeartbeat();
        runIntervals();
      }, getInterval());
    };
    
    runIntervals();
    
    return () => {
      clearTimeout(heartbeatInterval);
    };
  }, [user, isUserBlocked, isUserPending, fetchStats]);

  // Compute SN counts map for duplicate detection
  const snCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(r => {
        const s = r.sn ? String(r.sn).trim().toUpperCase() : undefined;
        if(s) counts.set(s, (counts.get(s) || 0) + 1);
    });
    return counts;
  }, [data]);

  const snCounts2 = useMemo(() => {
    const counts = new Map<string, number>();
    data2.forEach(r => {
        const s = r.sn ? String(r.sn).trim().toUpperCase() : undefined;
        if(s) counts.set(s, (counts.get(s) || 0) + 1);
    });
    return counts;
  }, [data2]);

  // Check if Nokia data has already been imported
  const hasNokiaData = useMemo(() => {
      return data.some(r => r.id.startsWith('nok-'));
  }, [data]);

  // Helper to determine Critical status based on new rules
  const checkCritical = useCallback((r: ONTRecord, forceAlertsLogic = false) => {
      // MATRIX MODE ADAPTATION:
      // If ID starts with 'gen-', it's a matrix record.
      // Matrix Record Mapping:
      // r.msan -> CMD NETO (Input)
      // r.sn -> NOM MSAN (Result)
      // r.version -> SN (Input)
      
      const isMatrix = r.id.startsWith('gen-');
      
      // Determine the REAL Serial Number for logic
      const realSn = String(isMatrix ? (r.version || '') : (r.sn || ''));
      // Determine the REAL Version (Matrix has no version field usually, so default empty)
      const realVersion = String(isMatrix ? '' : (r.version || ''));
      
      const snUpper = realSn.trim().toUpperCase();
      const versionUpper = realVersion.trim().toUpperCase();
      const vendorUpper = String(r.vendorId || '').toUpperCase();
      
      // Logic adaptation for Nokia/Huawei detection
      const isNokia = vendorUpper.includes('ALCL') || versionUpper.startsWith('ALCL') || snUpper.startsWith('ALCL');
      const isHuawei = vendorUpper.includes('HWTC') || vendorUpper.includes('HUAWEI') || snUpper.startsWith('4857') || snUpper.startsWith('HWT') || vendorUpper === 'HUAWEI';

      let rack = '0';
      let shelf = '0';

      let col1 = String(r.msan || '');
      let col2 = String(r.location || '');
      const isSimpleMode = (activeTab === 'dashboard' || activeTab === 'dashboard2' || activeTab === 'search') && !forceAlertsLogic;

      // NEW: Extract location from NOM MSAN for NOKIA records in Simple Search
      if (isSimpleMode && isNokia && col1 && col1.includes(':')) {
          const colonIndex = col1.indexOf(':');
          const locStr = col1.substring(colonIndex);
          
          const rMatch = locStr.match(/R(\d+)/i);
          const sMatch = locStr.match(/S(\d+)/i);
          const ltMatch = locStr.match(/LT(\d+)/i);
          const ponMatch = locStr.match(/PON(\d+)/i);
          const ontMatch = locStr.match(/(?:ONT|ONU)(\d+)/i);
          
          if (ltMatch && ponMatch) {
              const rackVal = rMatch ? rMatch[1] : '0';
              const shelfVal = sMatch ? sMatch[1] : '0';
              const ontVal = ontMatch ? ontMatch[1] : '0';
              col2 = `${rackVal}/${shelfVal}/${ltMatch[1]}/${ponMatch[1]}/${ontVal}`;
              rack = rackVal;
              shelf = shelfVal;
          }
      }

      const locUpper = col2.toUpperCase().replace(/\s/g, '');
      
      const fsspMatch = locUpper.match(/FRAME:(\d+)\/SHELF:(\d+)/);
      const fspMatch = locUpper.match(/FRAME:(\d+)\/SLOT:(\d+)/); 

      if (fsspMatch) {
          rack = fsspMatch[1];
          shelf = fsspMatch[2];
      } else if (fspMatch) {
          rack = fspMatch[1];
          shelf = '0';
      } else {
          const parts = String(r.location || '').split('/').map(s => s.trim());
          if (parts.length >= 3 && parts.every(p => /^\d+$/.test(p))) {
              rack = parts[0];
              if (parts.length >= 4) {
                  shelf = parts[1];
              }
          }
      }

      if (rack === '1' && shelf === '0') {
          shelf = '1';
      }

      let effectiveStatus = r.status;
      // Removed Nokia isolated -> critical rule per user request

      let isNewCriticalRule = false;
      if (snUpper.startsWith('HWT')) {
          isNewCriticalRule = true;
      } else if (snUpper.startsWith('414C') || versionUpper.startsWith('ALCL')) {
          if (rack === '0') {
              isNewCriticalRule = true;
          }
      }

      // Exception Logic: If Rack 1 and Status is 'active', do NOT treat as critical
      const isRack1Active = rack === '1' && effectiveStatus === 'active';

      const isHuaweiRack1 = isHuawei && rack === '1';
      const isHuaweiAlcl = isHuawei && snUpper.startsWith('414C434C');
      
      // Blue Condition (Not applied if Huawei Rack 1, unless overruled?)
      const isBlueCondition = ((isHuawei && rack === '0') || (isNokia && rack === '1')) && !isHuaweiRack1 && !isHuaweiAlcl;
      
      // Red Condition (Critical)
      const isRedCondition = ((isNokia && rack === '0') || isHuaweiRack1 || isHuaweiAlcl);

      // Force Critical to False if Rack 1 and Active (EXCEPT in alerts tab)
      const isAlertsTab = activeTab === 'alerts' || forceAlertsLogic;
      if (isRack1Active && !isAlertsTab) return false;
      // Actually applies to any vendor if Location is present and Active in Simple Search
      const hasValidLocation = col2 && col2 !== '---' && col2 !== 'R1.S1.LT15.PON10.NEWONT3';
      
      if (isSimpleMode && hasValidLocation && !isRedCondition) {
          return false;
      }

      let isCritical = (effectiveStatus === 'critical' || isNewCriticalRule || isRedCondition) && !isBlueCondition;
      
      if (effectiveStatus === 'isolated' && isNokia) {
          isCritical = false;
      }

      return isCritical;
  }, [activeTab]);

  // Helper to generate massive data records
  const generateRecordsFromSns = useCallback((sns: string[], currentData: ONTRecord[]) => {
      if (!sns || sns.length === 0) return [];
      
      const records: ONTRecord[] = [];
      const snMap = new Map<string, ONTRecord>();
      const seenSns = new Set<string>();
      
      currentData.forEach(r => {
           if (r.sn) snMap.set(String(r.sn).trim().toUpperCase(), r);
      });

      for (let i = 0; i < sns.length; i += 4) {
           if (sns[i]) {
                 const inputLine1 = String(sns[i] || ''); // CMD NETO (Input Line 1)
                 const inputLine3 = String(sns[i+2] || ''); 
                 const inputLine4 = String(sns[i+3] || ''); // SN (Input Line 4)

                 let searchKey = inputLine4.trim().toUpperCase();
                 
                 // NEW: If SN contains 'ALCL', start the search from 'ALCL'
                 const alclIndex = searchKey.indexOf('ALCL');
                 if (alclIndex !== -1) {
                     searchKey = searchKey.substring(alclIndex);
                 }
                 
                 // Skip if we've already processed this SN in this massive search
                 if (seenSns.has(searchKey)) continue;
                 seenSns.add(searchKey);

                 let foundRecord = snMap.get(searchKey);

                 if (!foundRecord && searchKey.startsWith('ALCL')) {
                     const hexKey = '414C434C' + searchKey.substring(4);
                     foundRecord = snMap.get(hexKey);
                 } else if (!foundRecord && searchKey.startsWith('414C434C')) {
                     const alclKey = 'ALCL' + searchKey.substring(8);
                     foundRecord = snMap.get(alclKey);
                 }
                 
                 const resultNomMsan = foundRecord ? foundRecord.msan : (inputLine3 || 'NON TROUVÉ');
                 const resultLocation = foundRecord ? foundRecord.location : '---';
                 
                 let vendorId = foundRecord ? foundRecord.vendorId : '';
                 const inputLine4Upper = inputLine4.trim().toUpperCase();
                 if (inputLine4Upper.startsWith('ALCL') || inputLine4Upper.startsWith('414C434C')) {
                     vendorId = 'ALCL';
                 }

                 let status: ONTStatus = 'isolated'; 

                 if (foundRecord) {
                    status = foundRecord.status;
                    let rack = '0';
                    if (resultLocation && resultLocation !== '---' && resultLocation !== '--/--/--' && resultLocation !== 'R1.S1.LT15.PON10.NEWONT3') {
                        const locUpper = String(resultLocation).toUpperCase().replace(/\s/g, '');
                        const fsspMatch = locUpper.match(/FRAME:(\d+)\/SHELF:(\d+)/);
                        const fspMatch = locUpper.match(/FRAME:(\d+)\/SLOT:(\d+)/);
                        if (fsspMatch) rack = fsspMatch[1];
                        else if (fspMatch) rack = fspMatch[1];
                        else {
                            const parts = String(resultLocation).split('/').map(s => s.trim());
                            if (parts.length >= 3 && parts.every(p => /^\d+$/.test(p))) rack = parts[0];
                        }

                        const v = String(vendorId).toUpperCase();
                        const isSupported = v.includes('HWTC') || v.includes('HUAWEI') || v.includes('ALCL') || searchKey.startsWith('4857') || searchKey.startsWith('ALCL');

                        if (isSupported) {
                            if (rack === '1') status = 'active';
                            else if (status !== 'critical') status = 'active';
                        }
                    }
                 } else {
                    status = 'isolated';
                 }

                 let finalVersion = inputLine4;
                 if (vendorId === 'ALCL' && /414C434C/i.test(finalVersion)) {
                     finalVersion = finalVersion.replace(/414C434C/gi, 'ALCL');
                 }
                 records.push({
                     id: `gen-${i}-${Date.now()}`,
                     msan: inputLine1,               
                     location: resultLocation,       
                     sn: resultNomMsan,              
                     version: finalVersion,            
                     vendorId: vendorId,
                     status: status
                 });
           }
      }
      return records;
  }, []);

  // 1. GENERATE MASSIVE DATA (Unfiltered)
  const generatedMassiveData = useMemo(() => {
      return generateRecordsFromSns(filters.massiveSns || [], data);
  }, [filters.massiveSns, data, generateRecordsFromSns]);

  // 1.1 GENERATE WAITING DATA (Cumulative Isolated)
  const generatedWaitingData = useMemo(() => {
      return generateRecordsFromSns(filters.waitingSns || [], data);
  }, [filters.waitingSns, data, generateRecordsFromSns]);

  // Intersection logic for ONT RÉPÉTÉS (Duplicates between Recherche simple and Inventaire FTTH)
  const intersectionSns = useMemo(() => {
    if (data.length === 0 || data2.length === 0) return new Set<string>();
    const snSet2 = new Set(data2.map(r => r.sn ? String(r.sn).trim().toUpperCase() : undefined).filter(Boolean));
    const result = new Set<string>();
    data.forEach(item => {
      const s = item.sn ? String(item.sn).trim().toUpperCase() : undefined;
      if (s && snSet2.has(s)) {
        const vendorUpper = String(item.vendorId || '').toUpperCase();
        const snUpper = s;
        const versionUpper = String(item.version || '').toUpperCase();
        const isNokia = vendorUpper.includes('ALCL') || versionUpper.startsWith('ALCL') || snUpper.startsWith('ALCL') || snUpper.startsWith('414C');
        const isHuawei = vendorUpper.includes('HWTC') || vendorUpper.includes('HUAWEI') || snUpper.startsWith('4857') || snUpper.startsWith('HWT') || vendorUpper === 'HUAWEI';
        if (isNokia || isHuawei) result.add(s);
      }
    });
    return result;
  }, [data, data2]);

  const waitingCount = useMemo(() => {
      return generatedWaitingData.length;
  }, [generatedWaitingData]);

  const globalCriticalCount = useMemo(() => {
      let count = 0;
      data.forEach(r => {
          if (checkCritical(r, true)) count++;
      });
      return count;
  }, [data, checkCritical]);

  const globalCriticalCount2 = useMemo(() => {
      let count = 0;
      data2.forEach(r => {
          if (checkCritical(r, true)) count++;
      });
      return count;
  }, [data2, checkCritical]);

  const intersectionCount = useMemo(() => {
    let count = 0;
    data.forEach(item => {
      const s = item.sn ? String(item.sn).trim().toUpperCase() : undefined;
      if (s && intersectionSns.has(s)) count++;
    });
    return count;
  }, [data, intersectionSns]);

  const filteredData = useMemo(() => {
    const matchStatus = (item: ONTRecord) => {
        if (!filters.status) return true;
        
        let isCrit = checkCritical(item);
        let isSpecialIsolated = false;

        const isMatrixMode = activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting';
        if (isMatrixMode) {
             const isCmdNetoPresent = item.msan && item.msan !== '---';
             const isEmplacementMissing = !item.location || item.location === '---';
             
             // If it matches the special rule (Yellow Row), treat as ISOLATED, NOT CRITICAL
             if (isCrit && isCmdNetoPresent && isEmplacementMissing) {
                 isSpecialIsolated = true;
                 isCrit = false; 
             }
        }

        if (filters.status === 'critical') return isCrit;
        if (isCrit) return false;
        
        if (filters.status === 'isolated') {
            return isSpecialIsolated || item.status === 'isolated';
        }
        
        return item.status === filters.status;
    };

    const matchRepeated = (item: ONTRecord) => {
        if (!filters.showRepeated && activeTab !== 'duplicates') return true;
        const s = item.sn ? String(item.sn).trim().toUpperCase() : undefined;
        return s ? intersectionSns.has(s) : false;
    };

    if (activeTab === 'archive') {
        return archiveData;
    }

    if (activeTab === 'dashboard2') {
        return data2.filter(item => {
          const cleanSnFilter = filters2.sn.trim().toLowerCase();
          
          let matchSN = true;
          if (cleanSnFilter) {
              matchSN = String(item.sn || '').toLowerCase().includes(cleanSnFilter);
          }

          const cleanMsanTextFilter = filters2.location.trim().toLowerCase();
          const matchMsanText = !cleanMsanTextFilter || String(item.msan || '').toLowerCase().includes(cleanMsanTextFilter);
          const matchMsanStrict = filters2.msan ? item.msan === filters2.msan : true;

          // Status Match Logic for Dashboard 2
          const matchStatus2 = (item: ONTRecord) => {
                if (!filters2.status) return true;
                let isCrit = checkCritical(item);
                if (filters2.status === 'critical') return isCrit;
                if (isCrit) return false;
                if (filters2.status === 'isolated') return item.status === 'isolated';
                return item.status === filters2.status;
          };

          return matchSN && matchMsanText && matchMsanStrict && matchStatus2(item);
        });
    }

    if (activeTab === 'duplicates') {
        return data.filter(item => {
             const s = item.sn ? String(item.sn).trim().toUpperCase() : undefined;
             return s && intersectionSns.has(s);
        });
    }

    // SPECIAL CASE: If main data is empty (after reset), show duplicates found against archive if showRepeated is on
    if (data.length === 0 && filters.showRepeated) {
        return repeatedRecords;
    }

    if (activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting') {
        // Handle showing stored duplicates if data is empty (Reset context in Matrix/Workflow)
        if (data.length === 0 && filters.showRepeated && repeatedRecords.length > 0) {
            return repeatedRecords;
        }

        const cleanSnFilter = filters.sn.trim().toLowerCase();
        const cleanMsanTextFilter = filters.location.trim().toLowerCase();

        const sourceData = activeTab === 'waiting' ? generatedWaitingData : generatedMassiveData;

        return sourceData.filter(item => {
             // In Matrix Mode, 'NOM MSAN' corresponds to `item.sn` (resultNomMsan).
             // 'SN' corresponds to `item.version`.
             
             let matchSN = true;
             if (cleanSnFilter) {
                 matchSN = String(item.version || '').toLowerCase().includes(cleanSnFilter);
             }

             const matchMsanText = !cleanMsanTextFilter || String(item.sn || '').toLowerCase().includes(cleanMsanTextFilter);
             const matchMsanStrict = filters.msan 
                ? (activeTab === 'waiting' ? item.msan === filters.msan : item.sn === filters.msan)
                : true;
             
             if (activeTab === 'waiting') {
                 // Force filter to 'isolated' status for 'waiting' tab
                 let isCrit = checkCritical(item);
                 let isSpecialIsolated = false;
                 const isCmdNetoPresent = item.msan && item.msan !== '---';
                 const isEmplacementMissing = !item.location || item.location === '---';
                 if (isCrit && isCmdNetoPresent && isEmplacementMissing) {
                     isSpecialIsolated = true;
                     isCrit = false; 
                 }
                 
                 const isIsolated = isSpecialIsolated || item.status === 'isolated';
                 return matchSN && matchMsanText && matchMsanStrict && isIsolated;
             }

             return matchSN && matchMsanText && matchMsanStrict && matchStatus(item);
        });
    }

    return data.filter(item => {
      const cleanSnFilter = filters.sn.trim().toLowerCase();
      
      let matchSN = true;
      if (cleanSnFilter) {
          matchSN = String(item.sn || '').toLowerCase().includes(cleanSnFilter);
      }

      const cleanMsanTextFilter = filters.location.trim().toLowerCase();
      const matchMsanText = !cleanMsanTextFilter || String(item.msan || '').toLowerCase().includes(cleanMsanTextFilter);
      const matchMsanStrict = filters.msan ? item.msan === filters.msan : true;

      return matchSN && matchMsanText && matchMsanStrict && matchStatus(item) && matchRepeated(item);
    });
  }, [data, data2, filters, filters2, activeTab, snCounts, checkCritical, generatedMassiveData, archiveData, repeatedRecords]);

  const stats: KPIStats = useMemo(() => {
    const isMatrixMode = activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting';

    if (isMatrixMode) {
        let activeCount = 0;
        let isolatedCount = 0;
        let workflowIsolatedCount = 0; // NEW: Count for special yellow rows
        
        filteredData.forEach(r => {
             const isCrit = checkCritical(r);
             
             // Workflow Special Rule Check
             const isCmdNetoPresent = r.msan && r.msan !== '---';
             const isEmplacementMissing = !r.location || r.location === '---';
             
             if ((isCrit || r.status === 'isolated') && isCmdNetoPresent && isEmplacementMissing) {
                 workflowIsolatedCount++;
                 isolatedCount++; 
             } else if (isCrit) {
                 // criticalCount++; // We use global count for critical card
             } else {
                 let effectiveStatus = r.status;
                 if (effectiveStatus === 'active') activeCount++;
                 else if (effectiveStatus === 'isolated') isolatedCount++;
             }
        });

        return {
            searched: activeCount, 
            total: filteredData.length,
            isolated: isolatedCount, 
            critical: activeTab === 'dashboard2' ? globalCriticalCount2 : globalCriticalCount,
            repeated: intersectionCount 
        };
    }

    const hasActiveFilters = 
        (activeTab === 'dashboard2' ? filters2 : filters).sn.trim() !== '' || 
        (activeTab === 'dashboard2' ? filters2 : filters).location.trim() !== '' || 
        (activeTab === 'dashboard2' ? filters2 : filters).msan !== '' || 
        (activeTab === 'dashboard2' ? filters2 : filters).status !== null || 
        (activeTab === 'dashboard2' ? filters2 : filters).showRepeated;

    // Determine which dataset to use for global counts
    let baseDataForStats = data;
    if (activeTab === 'dashboard2') baseDataForStats = data2;
    if (activeTab === 'archive') baseDataForStats = archiveData;
    if (activeTab === 'recap') baseDataForStats = recapData;
    if (activeTab === 'duplicates') baseDataForStats = filteredData;

    let globalIsolated = 0;
    let globalCritical = 0;
    let globalRepeated = 0;
    let huaweiCount = 0;
    let nokiaCount = 0;

    baseDataForStats.forEach(r => {
        if (checkCritical(r, true)) {
            globalCritical++;
        } else {
            if (r.status === 'isolated') globalIsolated++;
        }
        const val = r.id.startsWith('gen-') ? r.version : r.sn;
        const s = val ? String(val).trim().toUpperCase() : undefined;
        if (activeTab !== 'archive' && activeTab !== 'recap') {
            const currentSnCounts = activeTab === 'dashboard2' ? snCounts2 : snCounts;
            if ((currentSnCounts.get(s) || 0) > 1) {
                globalRepeated++;
            }
        }
        
        let isNokia = false;
        let isHuawei = false;
        
        if (r.id.startsWith('nok-')) {
            isNokia = true;
        } else if (r.id.startsWith('row-')) {
            isHuawei = true;
        } else {
            const vendorUpper = String(r.vendorId || '').toUpperCase();
            const versionUpper = String(r.version || '').toUpperCase();
            const snUpper = String(r.sn || '').toUpperCase();
            isNokia = vendorUpper.includes('ALCL') || versionUpper.startsWith('ALCL') || snUpper.startsWith('ALCL') || snUpper.startsWith('414C');
            isHuawei = vendorUpper.includes('HWTC') || vendorUpper.includes('HUAWEI') || snUpper.startsWith('4857') || snUpper.startsWith('HWT') || vendorUpper === 'HUAWEI';
        }
        
        if (isNokia) nokiaCount++;
        if (isHuawei) huaweiCount++;
    });

    return {
      searched: activeTab === 'recap' 
        ? recapData.filter(item => item.status === 'active' && (!filters.msan || item.msan === filters.msan)).length 
        : (activeTab === 'archive' || activeTab === 'duplicates' ? filteredData.length : (hasActiveFilters ? filteredData.length : 0)),
      total: baseDataForStats.length,
      isolated: globalIsolated,
      critical: activeTab === 'recap' ? 0 : globalCritical,
      repeated: activeTab === 'duplicates' 
        ? filteredData.length 
        : intersectionCount,
      huaweiCount,
      nokiaCount,
      connectedUsersCount
    };
  }, [data, data2, filteredData, filters, filters2, activeTab, snCounts, snCounts2, checkCritical, generatedMassiveData, lastRepeatedCount, massiveRepeatedCount, recapData, archiveData, repeatedRecords, massiveRepeatedRecords, intersectionSns, intersectionCount, connectedUsersCount]);

  const activeRecapData = useMemo(() => {
    const cleanSnFilter = filters.sn.trim().toLowerCase();
    const cleanMsanTextFilter = filters.location.trim().toLowerCase();

    return recapData.filter(item => {
        if (item.status !== 'active') return false;
        
        // Apply SN Search
        let matchSN = true;
        if (cleanSnFilter) {
            // In recap mode (massive data), SN is in .version
            matchSN = String(item.version || '').toLowerCase().includes(cleanSnFilter);
        }

        // Apply MSAN Text Search (NOM MSAN)
        // In recap mode, NOM MSAN is in .sn
        const matchMsanText = !cleanMsanTextFilter || String(item.sn || '').toLowerCase().includes(cleanMsanTextFilter);

        // Apply MSAN Strict Search (Combo Box)
        const matchMsanStrict = filters.msan ? item.msan === filters.msan : true;

        return matchSN && matchMsanText && matchMsanStrict;
    });
  }, [recapData, filters.sn, filters.location, filters.msan]);

  const msanOptions = useMemo(() => {
    if (activeTab === 'recap') {
        const unique = new Set(recapData.filter(d => d.status === 'active').map(d => d.msan));
        return Array.from(unique).filter(s => s && s !== '---').sort();
    }
    if (activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting') {
        // Return unique "CMD NETO" (mapped to .msan) if waiting, else "NOM MSAN" (mapped to .sn)
        const unique = activeTab === 'waiting' 
            ? new Set(generatedWaitingData.map(d => d.msan))
            : new Set(generatedMassiveData.map(d => d.sn));
        
        // Filter out placeholders
        return Array.from(unique).filter(s => s && s !== '---' && s !== 'NON TROUVÉ').sort();
    }
    const targetData = activeTab === 'dashboard2' ? data2 : data;
    const uniqueMsans = new Set(targetData.map(d => d.msan));
    return Array.from(uniqueMsans).sort();
  }, [data, data2, activeTab, generatedMassiveData, generatedWaitingData, recapData]);

  const handleImport = useCallback(async (file: File, type: 'standard' | 'nokia' = 'standard') => {
    setIsLoading(true);
    setLastRepeatedCount(0); // Reset archive stats
    setRepeatedRecords([]);  // Reset repeated records for new import
    const isDashboard2 = activeTab === 'dashboard2';
    try {
      await new Promise(r => setTimeout(r, 800)); 
      
      let records: ONTRecord[] = [];
      let saveTime = '';

      if (type === 'nokia') {
          if (file.type.startsWith('image/')) {
              records = await extractNokiaDataFromImage(file);
              saveTime = new Date().toLocaleString();
          } else {
              const result = await parseNokiaFile(file, setImportProgress, isDashboard2);
              records = result.records;
              saveTime = result.saveTime;
          }
      } else {
          const result = await parseExcelFile(file, setImportProgress);
          records = result.records;
          saveTime = result.saveTime;
      }
      
      setImportProgress(100);
      
      // NEW: If importing Huawei in "Recherche simple", check against "Inventaire FTTH" (data2)
      if (type === 'standard' && activeTab === 'search') {
          const importedSNs = new Set(records.map(r => r.sn ? String(r.sn).trim().toUpperCase() : undefined).filter(Boolean));
          const matchedRecords = data2.filter(d => {
              const s = d.sn ? String(d.sn).trim().toUpperCase() : undefined;
              return s && importedSNs.has(s);
          });
          
          if (matchedRecords.length > 0) {
              setRepeatedRecords(matchedRecords);
              setErrorDialog({
                  isOpen: true,
                  title: "ONT RÉPÉTÉS",
                  message: `${matchedRecords.length} ONTs trouvés dans l'Inventaire FTTH. Voir l'onglet 'ONT RÉPÉTÉS'.`
              });
          }
      }
      
      const setTargetData = isDashboard2 ? setData2 : setData;
      const currentData = isDashboard2 ? data2 : data;
      const realPrevData = currentData.filter(d => !d.id.startsWith('demo-'));

      const finalizeImport = (finalRecords: ONTRecord[]) => {
          setTargetData(finalRecords);
          const finalDate = saveTime || new Date().toLocaleString();
          if (isDashboard2) {
              setLastImportDate2(finalDate);
              setFilters2(prev => ({ ...prev, sn: '', location: '', msan: '', status: null, showRepeated: false }));
              dbService.saveData(finalRecords, true).catch(err => {
                  console.error("Background save failed (Dashboard 2):", err);
              });
          } else {
              setLastImportDate(finalDate);
              setFilters(prev => ({ ...prev, sn: '', location: '', msan: '', status: null, showRepeated: false }));
              // Background save to database
              dbService.saveONTData(finalRecords).catch(err => {
                  console.error("Background save failed:", err);
              });
          }
          
          // Delay hiding loading overlay so user can see 100%
          setTimeout(() => {
              setIsLoading(false);
              setImportProgress(undefined);
          }, 1000);
          soundService.playSuccess();
          addNotification(`Importation réussie : ${records.length} enregistrements traités.`, 'success');
      };

      if (realPrevData.length > 0) { 
          setIsLoading(false);
          setImportProgress(undefined);
          setConfirmConfig({
              title: "Importation de données",
              message: `Des données existent déjà (${realPrevData.length} enregistrements). Voulez-vous fusionner les nouvelles données avec les existantes ou tout remplacer ?`,
              confirmLabel: "Fusionner",
              cancelLabel: "Remplacer",
              onConfirm: () => {
                  // Merge logic: avoid duplicates by SN
                  const existingSns = new Set(realPrevData.map(r => String(r.sn || '').trim().toUpperCase()));
                  const newRecords = records.filter(r => !existingSns.has(String(r.sn || '').trim().toUpperCase()));
                  finalizeImport([...realPrevData, ...newRecords]);
                  setConfirmConfig(null);
              },
              onCancel: () => {
                  finalizeImport(records);
                  setConfirmConfig(null);
              }
          });
          return;
      }

      // Default case: empty or too large
      finalizeImport(records);
    } catch (error) {
      console.error("Failed to import", error);
      setTimeout(() => {
          setIsLoading(false);
          setImportProgress(undefined);
      }, 1000);
      soundService.playError();
      if (error === "INVALID_FORMAT_HUAWEI" || error === "INVALID_FORMAT_NOKIA") {
          setErrorDialog({
              isOpen: true,
              title: "Importation Impossible",
              message: "Les données que vous venez d'importer sont incorrecte , merci de vérifier"
          });
      } else {
          setErrorDialog({
              isOpen: true,
              title: "ERREUR D'IMPORTATION",
              message: "Erreur lors de l'importation. Vérifiez le format du fichier."
          });
      }
    }
  }, [lastImportDate, lastImportDate2, activeTab, data2]);

  const handleExport = useCallback(() => {
    const dataToExport = activeTab === 'recap' ? activeRecapData : (activeTab === 'archive' ? archiveData : filteredData);
    if (dataToExport.length === 0) return;
    soundService.playClick();
    const fileName = `ONT_Finder_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
    exportToExcel(
        dataToExport, 
        fileName, 
        activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting' || activeTab === 'recap' || activeTab === 'archive',
        activeTab === 'dashboard2'
    );
    soundService.playSuccess();
  }, [filteredData, activeRecapData, archiveData, activeTab]);

  const handleTransfer = useCallback(async () => {
    soundService.playClick();
    // Use data2 (Inventaire FTTH) as requested, regardless of current tab
    // Generate stable IDs to prevent duplicates on the server (ON CONFLICT (id) DO NOTHING)
    const dataToTransfer = data2.map(record => ({
      ...record,
      id: `${record.msan}-${record.location}-${record.sn}`.replace(/\s+/g, '_')
    }));

    if (dataToTransfer.length === 0) {
      setErrorDialog({
        isOpen: true,
        title: "TRANSFERT IMPOSSIBLE",
        message: "Aucune donnée à transférer."
      });
      return;
    }

    console.log("Transfer initiated. Data length:", dataToTransfer.length);
    
    setIsLoading(true);
    setImportProgress(0);

    try {
      const { success, addedCount } = await dbService.saveHuaweiData(dataToTransfer);
      
      setIsLoading(false);
      setImportProgress(undefined);

      if (success) {
        soundService.playSuccess();
        setErrorDialog({
          isOpen: true,
          title: "TRANSFERT RÉUSSI",
          message: "Opération de transfert achevées avec succès",
          type: 'success'
        } as any);
        
        // Refresh server update time
        const { lastUpdated } = await dbService.getHuaweiData();
        setLastServerUpdate(lastUpdated);
      } else {
        soundService.playError();
        setErrorDialog({
          isOpen: true,
          title: "ERREUR DE TRANSFERT",
          message: "Une erreur est survenue lors du transfert des données vers le serveur."
        });
      }
    } catch (error) {
      setIsLoading(false);
      setImportProgress(undefined);
      soundService.playError();
      setErrorDialog({
        isOpen: true,
        title: "ERREUR CRITIQUE",
        message: "Impossible de contacter le serveur pour le transfert."
      });
    }
  }, [data2]);

  const handleArchiveExport = useCallback((type: 'nokia' | 'huawei') => {
    if (archiveData.length === 0) return;
    soundService.playClick();
    const isNokia = type === 'nokia';
    const dataToExport = archiveData.filter(r => {
        const vendorUpper = String(r.vendorId || '').toUpperCase();
        const versionUpper = String(r.version || '').toUpperCase();
        const snUpper = String(r.sn || '').toUpperCase();
        const isALCL = vendorUpper.includes('ALCL') || versionUpper.startsWith('ALCL') || snUpper.startsWith('ALCL') || snUpper.startsWith('414C');
        return isNokia ? isALCL : !isALCL;
    });
    
    if (dataToExport.length === 0) {
        setErrorDialog({
            isOpen: true,
            title: "EXPORTATION IMPOSSIBLE",
            message: `Aucune donnée ${type.toUpperCase()} à exporter.`
        });
        return;
    }
    
    const fileName = `Archive_${type.toUpperCase()}_${new Date().toISOString().slice(0,10)}.xlsx`;
    exportToExcel(dataToExport, fileName, true);
    soundService.playSuccess();
  }, [archiveData]);

  const handleResetFilters = useCallback(() => {
    if (activeTab === 'dashboard2') {
        setFilters2({ sn: '', location: '', msan: '', status: null, showRepeated: false, massiveSns: [], waitingSns: [] });
        soundService.playClick();
        return;
    }
    setFilters(prev => {
        if (activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting') {
             return { ...prev, sn: '', location: '', msan: '', status: null, showRepeated: false };
        }
        return { sn: '', location: '', msan: '', status: null, showRepeated: false, massiveSns: prev.massiveSns, waitingSns: prev.waitingSns };
    });
    soundService.playClick();
  }, [activeTab, recapData.length]);

  const handleFullReset = useCallback(() => {
      const performReset = () => {
          setConfirmConfig(null);
          // User Request: sur onglet 'Recherche simple' (dashboard) si je click sur bouton 'VIDER' vider la table data.
          if (activeTab === 'dashboard' || activeTab === 'search') {
              setData([]);
              setFilters(prev => ({ sn: '', location: '', msan: '', status: null, showRepeated: false, massiveSns: recapData.length > 0 ? prev.massiveSns : [], waitingSns: [] }));
              setRepeatedRecords([]); // Also clear repeated records found for this data
              setLastImportDate(null);
              dbService.clearAllData();
              setStatsKey(prev => prev + 1); // Initialize stats grid labels (animation)
              soundService.playClick();
              return;
          }

          if (activeTab === 'waiting') {
              setFilters(prev => ({ ...prev, waitingSns: [] }));
              soundService.playClick();
              return;
          }

          if (activeTab === 'dashboard2') {
              setData2([]);
              setFilters2({ sn: '', location: '', msan: '', status: null, showRepeated: false, massiveSns: [] });
              setLastImportDate2(null);
              soundService.playClick();
              return;
          }

          if (activeTab === 'recap') {
              setRecapData([]);
              setFilters(prev => ({ ...prev, massiveSns: [] }));
              soundService.playClick();
              return;
          }

          let recordsToArchive: ONTRecord[] = [];
          
          // Determine which dataset to archive
          if (generatedMassiveData && generatedMassiveData.length > 0) {
              recordsToArchive = generatedMassiveData;
          } else if (data.length > 0) {
              recordsToArchive = data;
          }
      
          if (recordsToArchive.length > 0) {
              const getSn = (r: ONTRecord) => String(r.id.startsWith('gen-') ? (r.version || '') : (r.sn || ''));

              // 1. Identify Internal Duplicates
              const internalSnCounts = new Map<string, number>();
              recordsToArchive.forEach(r => {
                  const sn = getSn(r).trim().toUpperCase();
                  if (sn) internalSnCounts.set(sn, (internalSnCounts.get(sn) || 0) + 1);
              });

              // 2. Identify Duplicates vs Archive
              const archiveSnSet = new Set(archiveData.map(r => getSn(r).trim().toUpperCase()));
              
              const allDuplicatesToSave: ONTRecord[] = [];
              
              recordsToArchive.forEach(r => {
                   const sn = getSn(r).trim().toUpperCase();
                   const isInternalDup = (internalSnCounts.get(sn) || 0) > 1;
                   const isArchiveDup = sn && archiveSnSet.has(sn);

                   if (isInternalDup || isArchiveDup) {
                       allDuplicatesToSave.push(r);
                   }
              });
              
              if (allDuplicatesToSave.length > 0) {
                  setRepeatedRecords(prev => [...prev, ...allDuplicatesToSave]);
                  setLastRepeatedCount(prev => prev + allDuplicatesToSave.length); 
              }
      
              // 3. Archive (preventing MSAN duplicates in Archive)
              setArchiveData(prev => {
                  const existingMsans = new Set(prev.map(r => String(r.msan || '').trim().toUpperCase()));
                  const uniqueNew = recordsToArchive.filter(r => !existingMsans.has(String(r.msan || '').trim().toUpperCase()));
                  return [...prev, ...uniqueNew];
              });
          } 

          setFilters({ sn: '', location: '', msan: '', status: null, showRepeated: false, massiveSns: [], waitingSns: [] });
          setData([]);
          setRecapData([]); // Added back as per user request
          setLastImportDate(null);
          dbService.clearAllData();
          soundService.playClick();
      };

      const hasRecapData = recapData.length > 0;
      const hasWaitingData = (filters.waitingSns && filters.waitingSns.length > 0);

      if ((activeTab === 'dashboard' || activeTab === 'search') && (hasRecapData || hasWaitingData)) {
          setConfirmConfig({
              title: "Confirmer la suppression ?",
              message: "La file RECAP ou la file d'attente contient des données. Voulez-vous vraiment tout vider ?",
              onConfirm: performReset
          });
          return;
      }

      performReset();
  }, [activeTab, data, generatedMassiveData, archiveData, recapData, filters]);

  const handleClearArchive = useCallback(() => {
    setArchiveData([]);
    setLastRepeatedCount(0);
    setMassiveRepeatedCount(0);
    setMassiveRepeatedRecords([]);
    soundService.playSuccess();
  }, []);

  const handleClearDuplicates = useCallback(() => {
      setMassiveRepeatedRecords([]);
      setMassiveRepeatedCount(0);
      setRepeatedRecords([]);
      setLastRepeatedCount(0);
      soundService.playClick();
  }, []);

  const handleMassiveSearch = useCallback((sns: string[]) => {
      // Generate records from SNs
      const allNewRecords = generateRecordsFromSns(sns, data);
      
      // Filter internal duplicates and prepare for Recap
      const currentUniqueRecords: ONTRecord[] = [];
      const currentSearchDuplicates: ONTRecord[] = [];
      const seenInCurrentSearch = new Set<string>();

      allNewRecords.forEach(r => {
          const val = r.id.startsWith('gen-') ? r.version : r.sn;
          const snVal = val ? String(val).trim().toUpperCase() : undefined;
          if (!snVal) {
              currentUniqueRecords.push(r);
              return;
          }

          if (seenInCurrentSearch.has(snVal)) {
              currentSearchDuplicates.push(r);
          } else {
              currentUniqueRecords.push(r);
              seenInCurrentSearch.add(snVal);
          }
      });

      // Update Filters (Current search for Workflow, Cumulative Isolated for Waiting)
      setFilters(prev => {
          const currentMassiveSns = prev.massiveSns || [];
          const existingMassiveSns = new Set<string>();
          for (let i = 0; i < currentMassiveSns.length; i += 4) {
              if (currentMassiveSns[i+3]) {
                  existingMassiveSns.add(String(currentMassiveSns[i+3]).trim().toUpperCase());
              }
          }

          const currentWaitingSns = prev.waitingSns || [];
          const existingWaitingSns = new Set<string>();
          for (let i = 0; i < currentWaitingSns.length; i += 4) {
              if (currentWaitingSns[i+3]) {
                  existingWaitingSns.add(String(currentWaitingSns[i+3]).trim().toUpperCase());
              }
          }

          const newMassiveChunks: string[] = [];
          for (let i = 0; i < sns.length; i += 4) {
              const snVal = sns[i+3] ? String(sns[i+3]).trim().toUpperCase() : '';
              if (snVal && !existingMassiveSns.has(snVal)) {
                  newMassiveChunks.push(...sns.slice(i, i + 4));
                  existingMassiveSns.add(snVal);
              }
          }

          const newIsolatedChunks: string[] = [];
          const updatedWaitingSns = [...currentWaitingSns];

          allNewRecords.forEach(r => {
              const snVal = r.version ? String(r.version).trim().toUpperCase() : '';
              if (r.status !== 'isolated') {
                  if (snVal && existingWaitingSns.has(snVal)) {
                      // Remove from waitingSns
                      const indexToRemove = updatedWaitingSns.findIndex((val, idx) => idx % 4 === 3 && String(val).trim().toUpperCase() === snVal);
                      if (indexToRemove !== -1) {
                          updatedWaitingSns.splice(indexToRemove - 3, 4);
                          existingWaitingSns.delete(snVal);
                      }
                  }
              } else {
                  const match = r.id.match(/^gen-(\d+)-/);
                  if (match) {
                      const idx = parseInt(match[1]);
                      if (snVal && !existingWaitingSns.has(snVal)) {
                          newIsolatedChunks.push(...sns.slice(idx, idx + 4));
                          existingWaitingSns.add(snVal);
                      }
                  }
              }
          });

          return {
              ...prev,
              massiveSns: [...currentMassiveSns, ...newMassiveChunks],
              waitingSns: [...updatedWaitingSns, ...newIsolatedChunks]
          };
      });

      // Calculate signalRetabliCount separately to avoid side effects in setFilters
      const currentWaitingSns = filters.waitingSns || [];
      const existingWaitingSns = new Set<string>();
      for (let i = 0; i < currentWaitingSns.length; i += 4) {
          if (currentWaitingSns[i+3]) {
              existingWaitingSns.add(String(currentWaitingSns[i+3]).trim().toUpperCase());
          }
      }

      let signalRetabliCount = 0;
      allNewRecords.forEach(r => {
          const snVal = r.version ? String(r.version).trim().toUpperCase() : '';
          if (r.status !== 'isolated' && snVal && existingWaitingSns.has(snVal)) {
              signalRetabliCount++;
          }
      });

      if (signalRetabliCount > 0) {
          setTimeout(() => {
              addNotification(`Signal rétabli pour ${signalRetabliCount} ONT(s)`, 'success', undefined, undefined, 'MISE À JOUR');
              soundService.playSuccess();
          }, 500);
      }

      // Append current unique results to Recap Data (User request: ne pas vider la table data)
      setRecapData(prev => {
          const newRecap = [...prev];
          const existingIndices = new Map<string, number>();
          prev.forEach((r, idx) => {
              const val = r.id.startsWith('gen-') ? r.version : r.sn;
              const snVal = val ? String(val).trim().toUpperCase() : undefined;
              if (snVal) existingIndices.set(snVal, idx);
          });

          currentUniqueRecords.forEach(r => {
              const val = r.id.startsWith('gen-') ? r.version : r.sn;
              const snVal = val ? String(val).trim().toUpperCase() : undefined;
              if (!snVal) {
                  newRecap.push(r);
              } else if (existingIndices.has(snVal)) {
                  // Update existing record to latest status
                  newRecap[existingIndices.get(snVal)!] = r;
              } else {
                  newRecap.push(r);
                  existingIndices.set(snVal, newRecap.length - 1);
              }
          });
          return newRecap;
      });

      // LOGIC TO COUNT DUPLICATES VS ARCHIVE
      let archiveDupCount = 0;
      const archiveDuplicates: ONTRecord[] = [];
      if (archiveData.length > 0) {
          const archiveSet = new Set<string>();
          archiveData.forEach(r => {
              const val = r.id.startsWith('gen-') ? r.version : r.sn;
              const snVal = val ? String(val).trim().toUpperCase() : undefined;
              if (snVal) archiveSet.add(snVal);
          });

          for (let i = 0; i < allNewRecords.length; i++) {
              const r = allNewRecords[i];
              const val = r.id.startsWith('gen-') ? r.version : r.sn;
              const snVal = val ? String(val).trim().toUpperCase() : undefined;
              if (snVal && archiveSet.has(snVal)) {
                  archiveDupCount++;
                  archiveDuplicates.push(r);
              }
          }
      }
      
      // Total repeated count for this search session
      setMassiveRepeatedCount(currentSearchDuplicates.length + archiveDupCount);
      setMassiveRepeatedRecords([...currentSearchDuplicates, ...archiveDuplicates]);

      // Switch to workflow tab to show results
      setActiveTab('workflow');
  }, [archiveData, data, generateRecordsFromSns]);

  const handleMassiveReset = useCallback(() => {
      setFilters(prev => ({ ...prev, massiveSns: [] }));
      setMassiveRepeatedCount(0); // Reset count
  }, []);

  const handleArchiveClearConfirm = useCallback(() => {
      setArchiveData([]);
      soundService.playSuccess();
  }, []);

  // NEW: Handle calculation and display of Tech Stats
  const handleShowTechStats = useCallback(() => {
      if (filteredData.length === 0) return;
      
      let huaweiCount = 0;
      let nokiaCount = 0;
      let otherCount = 0;
      let foundCount = 0;
      let rack0Count = 0;
      let rack1Count = 0;

      filteredData.forEach(r => {
          const vendorUpper = String(r.vendorId || '').toUpperCase();
          const versionUpper = String(r.version || '').toUpperCase();
          const snUpper = String(r.sn || '').toUpperCase();
          // Simplified Vendor Logic for Stats
          const isHuawei = vendorUpper.includes('HWTC') || vendorUpper.includes('HUAWEI') || versionUpper.startsWith('4857') || snUpper.startsWith('4857');
          const isNokia = vendorUpper.includes('ALCL') || versionUpper.startsWith('ALCL') || snUpper.startsWith('ALCL') || snUpper.startsWith('414C');

          if (isHuawei) huaweiCount++;
          else if (isNokia) nokiaCount++;
          else otherCount++;

          // Check if "found" in Simple Search DB
          // In Matrix mode, 'location' is populated from DB if found, otherwise it's '---' or '--/--/--'
          if (r.location && r.location !== '---' && r.location !== '--/--/--' && r.location !== 'R1.S1.LT15.PON10.NEWONT3') {
              foundCount++;

              // Parse Rack Information for special stats
              let rack = '';
              const locUpper = String(r.location).toUpperCase().replace(/\s/g, '');
              const fsspMatch = locUpper.match(/FRAME:(\d+)\/SHELF:(\d+)/);
              const fspMatch = locUpper.match(/FRAME:(\d+)\/SLOT:(\d+)/); 

              if (fsspMatch) {
                  rack = fsspMatch[1];
              } else if (fspMatch) {
                  rack = fspMatch[1];
              } else {
                  const parts = String(r.location).split('/').map(s => s.trim());
                  if (parts.length >= 3 && parts.every(p => /^\d+$/.test(p))) {
                      rack = parts[0];
                  }
              }

              if (rack === '0') rack0Count++;
              if (rack === '1') rack1Count++;
          }
      });

      setTechStats({
          total: filteredData.length,
          huawei: huaweiCount,
          nokia: nokiaCount,
          others: otherCount,
          found: foundCount,
          rack0: rack0Count,
          rack1: rack1Count
      });
      setShowTechStats(true);
  }, [filteredData]);

  const handleLogin = useCallback(async (loggedInUser: User) => {
      if (loggedInUser.status === 'blocked') {
          setIsUserBlocked(true);
          setIsUserPending(false);
      } else if (loggedInUser.status === 'pending') {
          setIsUserPending(true);
          setIsUserBlocked(false);
      } else {
          setIsUserBlocked(false);
          setIsUserPending(false);
      }

      setUser(loggedInUser);
      setLoginTime(new Date());
      dbService.setCurrentUser(loggedInUser);
      
      // Only reset data/tab if active
      if (loggedInUser.status === 'active') {
          setData([]);
          setRecapData([]); 
          setFilters({ sn: '', location: '', msan: '', status: null, showRepeated: false, massiveSns: [] });
          setLastImportDate(null);
          dbService.clearAllData();
          setActiveTab('dashboard');
      }

      // Fetch initial stats immediately if admin
      if (loggedInUser.role === 'Super Admin' || loggedInUser.role === 'Administrateur') {
        try {
          const response = await fetch(`${API_BASE_URL}/api/users/stats`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setConnectedUsersCount(data.connectedUsers);
              setPendingUsersCount(data.pendingUsers);
            }
          }
        } catch (err) {
          console.error("Initial stats fetch error:", err);
        }
      }

      // Load Huawei data into Inventaire FTTH (data2)
      setIsInitialLoading(true);
      setIsLoading(true);
      try {
        const { records, lastUpdated } = await dbService.getHuaweiData();
        setData2(records);
        setLastImportDate2(lastUpdated);
      } catch (error) {
        console.error("Failed to load Huawei data on login:", error);
      } finally {
        // Add a delay to ensure the splash screen (image 1) is visible as requested
        setTimeout(() => {
          setIsLoading(false);
          setIsInitialLoading(false);
        }, 3000);
      }
  }, []);

  const handleLogout = useCallback(async () => {
    if (user && loginTime) {
        const logoutTime = new Date();
        const durationMinutes = Math.round((logoutTime.getTime() - loginTime.getTime()) / 60000);
        await dbService.saveLog(user.username, loginTime.toISOString(), logoutTime.toISOString(), durationMinutes);
    }
    setUser(null);
    setIsUserBlocked(false);
    setIsUserPending(false);
    setLoginTime(null);
    dbService.setCurrentUser(null);
    setIsAdminUnlocked(false);
    setPendingUsersCount(0);
    setConnectedUsersCount(0);
    soundService.playClick();
  }, [user, loginTime]);

  const handleStatClick = useCallback((status: ONTStatus | 'total' | 'searched' | 'repeated') => {
    soundService.playClick();
    if (status === 'searched') {
        if (activeTab === 'duplicates') {
             setActiveTab('recap');
        } else if (activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting') {
             setFilters(prev => ({ ...prev, status: prev.status === 'active' ? null : 'active' }));
        } else {
             setModalConfig({ results: filteredData, title: filters.sn || 'Résultats actuels' });
        }
    } else if (status === 'total') {
        setFilters(prev => ({ ...prev, status: null, showRepeated: false }));
        if (activeTab === 'duplicates') setActiveTab('dashboard');
    } else if (status === 'repeated') {
        if (stats.repeated > 0) {
             setActiveTab('duplicates');
        }
    } else if (status === 'critical') {
        setActiveTab('alerts');
        setFilters(prev => ({ ...prev, status: 'critical', showRepeated: false }));
    } else {
        setFilters(prev => ({ ...prev, status: prev.status === status ? null : status, showRepeated: false }));
        if (activeTab === 'duplicates') setActiveTab('dashboard');
    }
  }, [filteredData, filters.sn, activeTab, stats]);

  const handleRowClick = useCallback((row: ONTRecord) => {
    setModalConfig({ results: [row], title: row.sn });
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    // Admin Tab Protection - Always ask for password on click
    if (tab === 'admin' || tab === 'logs') {
        if (user?.role !== 'Super Admin' && user?.role !== 'Administrateur' && user?.role !== 'Admin') {
            return;
        }
        setPendingAdminTab(tab);
        setShowAdminPasswordDialog(true);
        return;
    }

    // Lock admin if navigating away
    if ((activeTab === 'admin' || activeTab === 'logs') && (tab !== 'admin' && tab !== 'logs')) {
        setIsAdminUnlocked(false);
    }

    setActiveTab(tab);
    // Modified: Don't reset massiveSns when switching tabs.
    // Preserves 'FILE DE TRAVAIL' data even if user navigates to other menus (Dashboard, Search, etc.)
    setFilters(prev => ({ 
        ...prev, 
        sn: '', 
        msan: '', 
        location: '', 
        status: null, 
        showRepeated: false,
        massiveSns: prev.massiveSns // Keep massive data persisted
    }));
    
    if (tab === 'dashboard') {
        setStatsKey(prev => prev + 1);
    }
    if (tab === 'alerts') {
        setFilters(prev => ({ ...prev, status: 'critical' }));
    } 
  }, [user, activeTab, isAdminUnlocked]);

  const handleAdminUnlock = () => {
      setIsAdminUnlocked(true);
      setShowAdminPasswordDialog(false);
      if (pendingAdminTab) {
          setActiveTab(pendingAdminTab);
          setPendingAdminTab(null);
      }
      soundService.playSuccess();
  };

  const handleLogoClick = useCallback(() => {
    soundService.playHover();
    setSidebarToggleTrigger(prev => prev + 1);
  }, []);

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'matrix': return 'TABLEAU DE BORD';
      case 'search': return 'TABLEAU DE BORD';
      case 'multiple': return 'RECHERCHE AVANCÉE'; // New title for Multiple Search
      case 'workflow': return 'ESPACE DE TRAVAIL';
      case 'recap': return 'RÉCAPITULATIF';
      case 'archive': return 'ARCHIVE';
      case 'alerts': return `TABLEAU DE BORD (${globalCriticalCount})`;
      case 'duplicates': return 'ONT RÉPÉTÉS';
      case 'settings': return 'PARAMÉTRAGE SYSTÈME';
      case 'admin': return 'ADMINISTRATION';
      case 'logs': return 'LOGS DE CONNEXION';
      case 'dashboard':
      default: return 'TABLEAU DE BORD';
    }
  };

  const getBadgeLabel = () => {
    switch (activeTab) {
      case 'dashboard': return 'RECHERCHE SIMPLE';
      case 'matrix': return "File d'insertion";
      case 'search': return 'RECHERCHE AVANCÉE';
      case 'multiple': return 'RECHERCHE MULTIPLE'; // New Badge
      case 'workflow': return 'FILE DE TRAVAIL';
      case 'recap': return 'FILE RECAP';
      case 'archive1': return 'ARCHIVE';
      case 'archive': return 'ARCHIVES';
      case 'alerts': return `CENTRE D'ALERTES (${globalCriticalCount})`;
      case 'duplicates': return 'ONT RÉPÉTÉS';
      case 'settings': return "PARAMÉTRAGE";
      case 'dashboard2': return 'TOTAL PARC ONT';
      case 'waiting': return `FILE D'ATTENTE (${waitingCount})`;
      case 'queue': return `FILE D'ATTENTE (${waitingCount})`;
      default: return 'STATUT OPÉRATIONNEL';
    }
  };

  const getBadgeIcon = () => {
     switch (activeTab) {
        case 'dashboard': return <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'matrix': return <Database className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'search': return <ListFilter className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'multiple': return <ListFilter className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />; // Reusing ListFilter for now
        case 'workflow': return <ClipboardList className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'recap': return <Repeat className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'queue': return <Hourglass className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />; 
        case 'archive': return <Archive className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'alerts': return <AlertTriangle className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'duplicates': return <Copy className="w-3.5 h-3.5 text-cyan-400 animate-scale-pulse" />;
        case 'settings': return <Settings className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />;
        default: return <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 animate-pulse-soft" />;
     }
  };

  if (!user || ((isUserBlocked || isUserPending || isSessionInvalid) && !isAdmin)) {
      return (
          <div className="h-screen bg-slate-950 font-sans text-slate-200 relative overflow-hidden flex items-center justify-center p-6">
             {/* Background Decoration - More subtle */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full blur-[150px] opacity-10 transition-colors duration-1000 ${isUserBlocked || isSessionInvalid ? 'bg-rose-600' : 'bg-amber-600'}`}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
             </div>

             {!user ? (
               <LoginForm onLogin={handleLogin} />
             ) : (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="w-full max-w-md relative z-10 bg-slate-900/80 backdrop-blur-md border border-white/10 p-12 rounded-3xl shadow-2xl"
               >
                 <div className="text-center">
                    <h2 className={`text-3xl font-bold tracking-tight uppercase mb-6 ${isUserBlocked || isSessionInvalid ? 'text-rose-500' : 'text-amber-500'}`}>
                      {isSessionInvalid ? 'Session Multiple' : isUserBlocked ? 'Accès Restreint' : 'Vérification'}
                    </h2>

                    <p className="text-slate-300 text-base leading-relaxed mb-10">
                      {isSessionInvalid 
                        ? "Une autre connexion a été détectée sur ce compte. Une seule session active est autorisée."
                        : isUserBlocked 
                        ? "Votre accès au terminal a été suspendu par l'administrateur."
                        : "Votre compte est en attente d'approbation. Veuillez patienter."}
                    </p>

                    <div className="flex flex-col gap-4">
                      <button 
                        onClick={handleLogout}
                        className={`w-full py-4 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border shadow-lg active:scale-95 ${
                          isUserBlocked || isSessionInvalid
                          ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/50' 
                          : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400/50'
                        }`}
                      >
                        {isSessionInvalid ? 'Reconnecter ce Terminal' : 'Déconnexion'}
                      </button>
                      
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-4">
                        ID: {user.username.toUpperCase()} • {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                 </div>
               </motion.div>
             )}
          </div>
      );
  }

  const renderMainContent = () => {
    if (activeTab === 'settings') {
        return <SettingsPanel />;
    }

    if (activeTab === 'admin') {
        if (user?.role !== 'Super Admin' && user?.role !== 'Administrateur' && user?.role !== 'Admin') {
             return (
                <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="p-6 rounded-full bg-rose-900/20 border border-rose-500/20 mb-4 shadow-xl">
                        <ShieldAlert className="w-12 h-12 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Accès Refusé</h3>
                    <p className="text-xs text-slate-500 font-mono">Vous n'avez pas les droits nécessaires pour accéder à cette section.</p>
                </div>
             );
        }

        if (!isAdminUnlocked) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="p-6 rounded-full bg-blue-900/20 border border-blue-500/20 mb-4 shadow-xl">
                        <ShieldCheck className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Section Verrouillée</h3>
                    <p className="text-xs text-slate-500 font-mono">Veuillez cliquer sur le bouton Administration dans le menu pour déverrouiller cette section.</p>
                </div>
            );
        }

        return <AdminPanel onTransfer={handleTransfer} onRefreshStats={fetchStats} connectedUsersCount={connectedUsersCount} pendingUsersCount={pendingUsersCount} />;
    }

    if (activeTab === 'logs') {
        if (user?.role !== 'Super Admin' && user?.role !== 'Administrateur' && user?.role !== 'Admin') {
             return (
                <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="p-6 rounded-full bg-rose-900/20 border border-rose-500/20 mb-4 shadow-xl">
                        <ShieldAlert className="w-12 h-12 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Accès Refusé</h3>
                    <p className="text-xs text-slate-500 font-mono">Vous n'avez pas les droits nécessaires pour accéder à cette section.</p>
                </div>
             );
        }

        if (!isAdminUnlocked) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="p-6 rounded-full bg-blue-900/20 border border-blue-500/20 mb-4 shadow-xl">
                        <ShieldCheck className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Section Verrouillée</h3>
                    <p className="text-xs text-slate-500 font-mono">Veuillez cliquer sur le bouton Logs de Connexion dans le menu pour déverrouiller cette section.</p>
                </div>
            );
        }

        return <LogsPanel />;
    }

    if (activeTab === 'recap') {
        return (
            <div className="flex-grow flex flex-col h-full animate-fade-in-up">
                {recapData.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between px-6 py-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                Données Récapitulatives (Actifs)
                                <DigitalDisplay value={activeRecapData.length} color="blue" size="sm" />
                            </span>
                            <button 
                                onClick={() => { 
                                    soundService.playClick(); 
                                    setConfirmConfig({
                                        title: "Vider la file RECAP",
                                        message: "Êtes-vous certain de vouloir supprimer les données enregistrées dans la file RECAP ?",
                                        onConfirm: () => {
                                            setRecapData([]);
                                            setFilters(prev => ({ ...prev, massiveSns: [] }));
                                            dbService.saveRecapData([]);
                                            soundService.playSuccess();
                                            setConfirmConfig(null);
                                        }
                                    });
                                }}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-3 py-1.5 rounded-lg transition-all"
                            >
                                Vider la file RECAP
                            </button>
                        </div>
                        <DataTable 
                            data={activeRecapData} 
                            searchTerm={filters.sn || "MASSIVE"} 
                            onRowClick={handleRowClick}
                            lastImportDate={lastImportDate}
                            activeTab={activeTab}
                            criticalCount={globalCriticalCount}
                        />
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                            <Repeat className="w-24 h-24 text-slate-600 relative z-10 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-2 text-center max-w-lg leading-relaxed">
                            File RECAP
                        </h3>
                        <p className="text-sm font-medium text-slate-600 text-center max-w-md">
                            Aucune donnée analysée pour le moment.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    if (activeTab === 'multiple') {
        return (
            <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none animate-fade-in-up">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                    <ListFilter className="w-24 h-24 text-slate-600 relative z-10 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-2 text-center max-w-lg leading-relaxed">
                    Recherche Multiple
                </h3>
                <p className="text-xs text-slate-600 font-mono">Module de recherche multicritères en construction...</p>
            </div>
        );
    }

    if (activeTab === 'queue') {
        return (
            <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none animate-fade-in-up">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-pink-500/10 blur-xl rounded-full"></div>
                    <Hourglass className="w-24 h-24 text-slate-600 relative z-10 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-4 text-center max-w-lg leading-relaxed">
                    File d'attente
                </h3>
                
                {/* Styled Button matching image request */}
                <button 
                    onClick={() => soundService.playClick()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)] group hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all cursor-pointer active:scale-95"
                >
                    <Hourglass className="w-4 h-4 text-cyan-400 animate-scale-pulse" />
                    <span className="text-[10px] font-bold text-cyan-400 tracking-[0.2em] uppercase">
                        FILE D'ATTENTE
                    </span>
                </button>
                
                <p className="text-xs text-slate-600 font-mono mt-4">Module de gestion de file en cours de construction...</p>
            </div>
        );
    }

    if (activeTab === 'archive') {
        if (archiveData.length === 0) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none animate-fade-in-up">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                        <Archive className="w-24 h-24 text-slate-600 relative z-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-2 text-center max-w-lg leading-relaxed">
                        Archives Vides
                    </h3>
                    <p className="text-xs text-slate-600 font-mono">Videz une recherche simple pour archiver les données ici.</p>
                </div>
            );
        }
        return (
            <div className="flex-grow flex flex-col h-full overflow-hidden animate-fade-in-up">
                 <div className="flex items-center justify-between px-6 py-2">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         Données Archivées 
                         <DigitalDisplay value={archiveData.length} color="blue" size="sm" />
                     </span>
                 </div>
                 <DataTable 
                    data={archiveData} 
                    searchTerm="MASSIVE" // Use Massive format for archive to show CMD NETO in first column if possible
                    onBannerClick={() => {}}
                    onRowClick={handleRowClick}
                    isSimpleMode={false} // Use matrix/massive display mode
                    lastImportDate={lastImportDate}
                    activeTab={activeTab}
                    criticalCount={globalCriticalCount}
                />
            </div>
        );
    }

    if (activeTab === 'workflow' || activeTab === 'waiting') {
        // Check if we have data populated for the respective tab
        const hasData = activeTab === 'workflow' ? (filters.massiveSns && filters.massiveSns.length > 0) : (filters.waitingSns && filters.waitingSns.length > 0);
        
        if (hasData) {
             if (filteredData.length === 0) {
                 return (
                    <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
                        <div className="p-6 rounded-full bg-slate-900/50 border border-white/5 mb-4 shadow-xl">
                             <SearchX className="w-12 h-12 text-slate-600" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Aucune donnée trouvée</p>
                        <p className="text-[10px] text-slate-600 mt-2 font-mono">Vérifiez vos filtres</p>
                    </div>
                );
             }
             return (
                <DataTable 
                    data={filteredData} 
                    searchTerm={filters.sn || 'MASSIVE'} 
                    msanFilter={filters.msan}
                    onBannerClick={() => setModalConfig({ results: filteredData, title: (filters.sn || filters.msan) || 'Tous' })}
                    onRowClick={handleRowClick}
                    onClearFilter={handleResetFilters}
                    lastImportDate={lastImportDate}
                    activeTab={activeTab}
                    criticalCount={globalCriticalCount}
                />
            );
        }

        return (
            <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none animate-fade-in-up">
                <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-2 text-center max-w-lg leading-relaxed">
                    {activeTab === 'waiting' ? "File d'attente" : "File de travail"}
                </h3>
                <p className="text-xs text-slate-600 font-mono">
                    {activeTab === 'waiting' ? "En attente des données isolées..." : "En attente des données de l'analyse massive..."}
                </p>
            </div>
        );
    }

    if (activeTab === 'matrix') {
        if (data.length === 0) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none animate-fade-in-up">
                    {/* BUTTON MOVED ABOVE THE ICON/TEXT BLOCK */}
                    <button 
                        onClick={() => { soundService.playClick(); handleTabChange('dashboard'); }}
                        className="mb-12 relative group overflow-hidden rounded-xl bg-slate-900 border border-white/5 pr-12 pl-4 py-4 flex items-center gap-4 transition-all hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] active:scale-95 cursor-pointer"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-cyan-500"></div>
                        <LayoutGrid className="w-5 h-5 text-white" />
                        <span className="text-lg font-bold text-white tracking-tight">Recherche simple</span>
                        <div className="absolute right-4 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-amber-500/10 blur-xl rounded-full"></div>
                        <Upload className="w-24 h-24 text-slate-600 relative z-10 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-2 text-center max-w-lg leading-relaxed">
                        Il faut tout d'abord extraire les données
                    </h3>
                </div>
            );
        }

        if (!filters.massiveSns || filters.massiveSns.length === 0) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center opacity-30 select-none pointer-events-none animate-fade-in-up">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
                        <Database className="w-24 h-24 text-slate-700 relative z-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-700 uppercase tracking-[0.3em] mb-2">Zone de Résultats</h3>
                    <p className="text-xs text-slate-600 font-mono">Les données apparaîtront dans "FILE DE TRAVAIL" et "FILE RECAP"</p>
                </div>
            );
        }
        
        // In Matrix tab now, if search triggered, we redirect. 
        // But if user clicks back to Matrix, show empty state or waiting state.
        return (
             <div className="flex-grow flex flex-col items-center justify-center opacity-30 select-none pointer-events-none animate-fade-in-up">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
                    <Database className="w-24 h-24 text-slate-700 relative z-10" />
                </div>
                <h3 className="text-xl font-black text-slate-700 uppercase tracking-[0.3em] mb-2">Analyse Terminée</h3>
                <p className="text-xs text-slate-600 font-mono">Voir les résultats dans "FILE DE TRAVAIL" et "FILE RECAP"</p>
            </div>
        );
    }

    if (activeTab === 'duplicates') {
        if (filteredData.length === 0) {
            return (
               <div className="flex-grow flex flex-col items-center justify-center opacity-70 select-none animate-fade-in-up">
                   <div className="relative mb-6">
                       <div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full"></div>
                       <Copy className="w-24 h-24 text-slate-600 relative z-10" />
                   </div>
                   <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.1em] mb-2 text-center max-w-lg leading-relaxed">
                       Aucun doublon
                   </h3>
                   <p className="text-xs text-slate-600 font-mono">Tous les numéros de série sont uniques.</p>
               </div>
           );
        }
        return (
            <div className="flex-grow flex flex-col h-full overflow-hidden animate-fade-in-up">
                 <div className="flex items-center justify-between px-6 py-2">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         ONT RÉPÉTÉS DÉTECTÉS
                         <DigitalDisplay value={filteredData.length} color="orange" size="sm" />
                     </span>
                     <button 
                        onClick={() => { soundService.playClick(); handleClearDuplicates(); }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-3 py-1.5 rounded-lg transition-all"
                     >
                         Vider la file
                     </button>
                 </div>
                 <DataTable 
                    data={filteredData} 
                    searchTerm={filters.sn} 
                    onBannerClick={() => {}}
                    onRowClick={handleRowClick}
                    isSimpleMode={false}
                    lastImportDate={lastImportDate}
                    activeTab={activeTab}
                    criticalCount={globalCriticalCount}
                />
            </div>
        );
    }

    // If data is empty AND we are NOT in duplicates mode with available repeated records
    const currentData = activeTab === 'dashboard2' ? data2 : data;
    if (currentData.length === 0 && !(activeTab === 'duplicates' && repeatedRecords.length > 0)) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center opacity-30 select-none pointer-events-none animate-fade-in-up">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                    <Search className="w-24 h-24 text-slate-800 relative z-10" />
                </div>
                <h3 className="text-xl font-black text-slate-700 uppercase tracking-[0.3em] mb-2">Base de données vide</h3>
                <p className="text-xs text-slate-600 font-mono">Importez un fichier pour visualiser les données</p>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
                <div className="p-6 rounded-full bg-slate-900/50 border border-white/5 mb-4 shadow-xl">
                        <SearchX className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Aucun résultat trouvé</p>
                <p className="text-[10px] text-slate-600 mt-2 font-mono">Essayez de modifier vos critères de recherche</p>
            </div>
        );
    }

    const currentFilters = activeTab === 'dashboard2' ? filters2 : filters;

    return (
        <DataTable 
            data={filteredData} 
            searchTerm={((activeTab === 'workflow' || activeTab === 'waiting') && filters.massiveSns && filters.massiveSns.length > 0) ? 'MASSIVE' : currentFilters.sn} 
            msanFilter={currentFilters.msan}
            locationFilter={currentFilters.location}
            onBannerClick={() => setModalConfig({ results: filteredData, title: (currentFilters.sn || currentFilters.msan) || 'Tous' })}
            onRowClick={handleRowClick}
            onClearFilter={handleResetFilters}
            isAlertsMode={activeTab === 'alerts'}
            isSimpleMode={activeTab === 'dashboard' || activeTab === 'search' || activeTab === 'dashboard2'}
            lastImportDate={activeTab === 'dashboard2' ? lastImportDate2 : lastImportDate}
            activeTab={activeTab}
            criticalCount={activeTab === 'dashboard2' ? globalCriticalCount2 : globalCriticalCount}
        />
    );
  };

  return (
    <div className="h-screen bg-transparent font-sans text-slate-200 flex overflow-hidden">
      
      {importProgress !== undefined && (
        <LoadingOverlay progress={importProgress} />
      )}

      <SearchDialog 
        isOpen={!!modalConfig} 
        onClose={() => setModalConfig(null)}
        results={modalConfig?.results || []}
        searchTerm={modalConfig?.title || ''}
        activeTab={activeTab}
      />
      
      {/* Tech Stats Modal */}
      <TechStatsDialog 
        isOpen={showTechStats} 
        onClose={() => setShowTechStats(false)} 
        stats={techStats} 
      />

      <PasswordDialog 
        isOpen={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)} 
        onConfirm={handleArchiveClearConfirm} 
      />

      {/* Admin Unlock Dialog */}
      <PasswordDialog 
        isOpen={showAdminPasswordDialog} 
        onClose={() => setShowAdminPasswordDialog(false)} 
        onConfirm={handleAdminUnlock} 
      />

      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <ReadmeDialog isOpen={showReadme} onClose={() => setShowReadme(false)} />
      <LisezMoiDialog isOpen={showLisezMoi} onClose={() => setShowLisezMoi(false)} />
      
      {/* Admin Notification for Pending Users */}
      {(user?.role === 'Super Admin' || user?.role === 'Administrateur') && pendingUsersCount > 0 && activeTab !== 'admin' && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in-up">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.2)] rounded-2xl p-6 flex items-center gap-6 max-w-sm cursor-pointer hover:bg-slate-800/95 transition-all duration-300 hover:scale-105" onClick={() => handleTabChange('admin')}>
            <div className="p-3 bg-amber-500/20 rounded-full shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Approbation Requise</h4>
              <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                <span className="font-bold text-white">{pendingUsersCount}</span> nouvel{pendingUsersCount > 1 ? 's' : ''} utilisateur{pendingUsersCount > 1 ? 's' : ''} en attente.
              </p>
            </div>
          </div>
        </div>
      )}

      <MessageDialog 
        isOpen={showRepeatedInfo} onClose={() => setShowRepeatedInfo(false)}
        title="RESTRICTION SYSTÈME"
        message="En raison des restrictions de sécurité imposées par les navigateurs modernes, toute modification directe au sein d’un fichier d’archive est pour le moment impossible."
      />
      
      <MessageDialog 
        isOpen={!!errorDialog} onClose={() => setErrorDialog(null)}
        title={errorDialog?.title || ''} message={errorDialog?.message || ''}
        type="error" hideTechNote={true}
      />

      {/* Approval Success Message - Editorial/Luxury Style */}
      <AnimatePresence>
        {showApprovalSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md pointer-events-auto" onClick={() => setShowApprovalSuccess(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto ring-1 ring-white/5"
            >
              <div className="flex flex-col md:flex-row h-full">
                {/* Left Side - Visual Anchor */}
                <div className="md:w-2/5 bg-emerald-600 p-12 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative z-10">
                    <ShieldCheck className="w-16 h-16 text-white mb-8" />
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none uppercase">
                      Accès<br />Autorisé
                    </h2>
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.4em]">ONT Finder Pro</p>
                  </div>
                </div>

                {/* Right Side - Content */}
                <div className="md:w-3/5 p-12 flex flex-col justify-center bg-slate-900">
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-px bg-emerald-500"></div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em]">Félicitations</span>
                      </div>
                      <p className="text-slate-300 text-lg font-medium leading-relaxed">
                        Votre compte a été approuvé. Vous disposez désormais d'un accès complet aux outils du terminal.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/5">
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Opérateur</p>
                        <p className="text-sm text-white font-bold">{user?.username}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Rôle</p>
                        <p className="text-sm text-emerald-400 font-bold uppercase">{user?.role || 'Technicien'}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        soundService.playClick();
                        setShowApprovalSuccess(false);
                      }}
                      className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.4em] rounded-2xl shadow-xl transition-all active:scale-95 border border-emerald-400/30 hover:-translate-y-1"
                    >
                      Démarrer le Terminal
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {confirmConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setConfirmConfig(null)}></div>
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{confirmConfig.title}</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{confirmConfig.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                    if (confirmConfig.onCancel) {
                        confirmConfig.onCancel();
                    } else {
                        setConfirmConfig(null);
                    }
                }}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest border border-white/5"
              >
                {confirmConfig.cancelLabel || "Annuler"}
              </button>
              <button 
                onClick={confirmConfig.onConfirm}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/20"
              >
                {confirmConfig.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        toggleTrigger={sidebarToggleTrigger}
        onLogout={handleLogout}
        user={user}
        onAboutClick={() => setShowAbout(true)}
        onReadmeClick={() => setShowReadme(true)}
        onLisezMoiClick={() => setShowLisezMoi(true)}
        totalOntCount={stats.total}
        criticalOntCount={globalCriticalCount}
        activeOntCount={stats.searched}
        archiveCount={archiveData.length} // PASS ARCHIVE COUNT
        duplicateCount={stats.repeated} // PASS DUPLICATE COUNT
        waitingCount={waitingCount} // PASS WAITING COUNT
        connectedUsersCount={stats.connectedUsersCount} // PASS CONNECTED USERS COUNT
        isSnFound={filters.sn.trim() !== '' && filteredData.length > 0}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        <Header user={user} isSidebarCollapsed={isSidebarCollapsed} onLogoClick={handleLogoClick} />
        
        <main className="flex-1 flex flex-col max-w-[1920px] w-full mx-auto px-4 pt-1 pb-3 min-h-0">
          <>
            {activeTab !== 'settings' && activeTab !== 'admin' && activeTab !== 'logs' && (
                <>
                    <div className="shrink-0 z-10 relative">
                        <SectionHeader 
                            title={getSectionTitle()}
                            searchTerm={filters.sn} 
                            msanFilter={filters.msan}
                            locationFilter={filters.location}
                            onClearFilter={handleResetFilters}
                            isDataLoaded={activeTab === 'recap' ? recapData.length > 0 : (activeTab === 'archive' ? archiveData.length > 0 : (activeTab === 'duplicates' ? filteredData.length > 0 : data.length > 0))}
                            isMassiveSearchEmpty={activeTab === 'matrix' && (!filters.massiveSns || filters.massiveSns.length === 0)}
                        />
                    </div>
                    <div className="shrink-0 z-10 relative">
                    <StatsGrid 
                        key={statsKey}
                        stats={stats} 
                        selectedStatus={filters.status} 
                        showRepeated={filters.showRepeated || activeTab === 'duplicates'}
                        onStatClick={handleStatClick}
                        onOntTrouvesClick={() => setIsOntTrouvesClicked(true)}
                        isMatrixMode={activeTab === 'matrix' || activeTab === 'workflow' || activeTab === 'waiting'}
                        activeTab={activeTab}
                    />
                    </div>
                    {activeTab === 'archive' && archiveData.length > 0 && (
                        <div className="flex justify-end items-center gap-4 px-6 py-3 animate-fade-in-up shrink-0 z-10 relative">
                            <button 
                                onClick={handleExport}
                                className="flex items-center justify-center gap-2 px-6 py-2 backdrop-blur-lg border font-bold rounded-xl text-xs transition-all duration-300 uppercase tracking-widest shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:scale-95 bg-blue-600/20 border-blue-400/30 text-blue-100 hover:bg-blue-600/30 hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:border-blue-400/50 group"
                            >
                                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-300 text-blue-200" />
                                EXPORTER
                            </button>
                            <button 
                                onClick={() => {
                                    soundService.playClick();
                                    setConfirmConfig({
                                        title: "Vider l'archive",
                                        message: "Êtes-vous certain de vouloir supprimer les données enregistrées dans l'archive ?",
                                        onConfirm: () => {
                                            handleClearArchive();
                                            setConfirmConfig(null);
                                        }
                                    });
                                }}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-4 py-2 rounded-xl transition-all"
                            >
                                VIDER LA FILE ARCHIVE
                            </button>
                        </div>
                    )}
                </>
            )}

            {data.length > 0 && activeTab !== 'settings' && activeTab !== 'archive' && activeTab !== 'admin' && activeTab !== 'duplicates' && ((activeTab !== 'workflow' && activeTab !== 'waiting') || (activeTab === 'workflow' && filters.massiveSns && filters.massiveSns.length > 0) || (activeTab === 'waiting' && filters.waitingSns && filters.waitingSns.length > 0)) && (
               <div className="flex justify-start px-6 mt-4 mb-2 animate-fade-in-up">
                   <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-950 border border-cyan-500/30 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)] group hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all cursor-help">
                      {getBadgeIcon()}
                      <span className="text-[9px] font-bold text-cyan-400 tracking-[0.2em] uppercase">
                      {getBadgeLabel()}
                      </span>
                  </div>
               </div>
            )}

            {activeTab === 'matrix' ? (
              <div className="shrink-0 z-10 relative">
                 <MassiveSearch 
                    onSearch={handleMassiveSearch} 
                    onClear={handleMassiveReset}
                    onExport={handleExport}
                    onShowStats={handleShowTechStats}
                    currentCount={filteredData.length}
                    totalDataCount={data.length}
                    msanOptions={msanOptions}
                    selectedMsan={filters.msan}
                    onMsanChange={(val) => setFilters(prev => ({ ...prev, msan: val }))}
                    hasActiveSearch={filters.massiveSns && filters.massiveSns.length > 0}
                 />
              </div>
            ) : (activeTab === 'workflow' || activeTab === 'waiting') ? (
               // If in workflow mode and we have massive data, we show ActionBar for exports/reset
               ((activeTab === 'workflow' && filters.massiveSns && filters.massiveSns.length > 0) || (activeTab === 'waiting' && filters.waitingSns && filters.waitingSns.length > 0)) ? (
                  <div className="shrink-0 z-10 relative">
                      <ActionBar 
                      filters={filters}
                      msanOptions={msanOptions}
                      onFilterChange={(f) => setFilters(f)}
                      onImport={handleImport}
                      onExport={handleExport}
                      onReset={handleFullReset}
                      onOpenSearch={() => setModalConfig({ results: filteredData, title: filters.sn || 'Recherche' })}
                      isLoading={isLoading}
                      lastImportDate={lastImportDate}
                      isDataLoaded={data.length > 0}
                      simpleMode={false}
                      hasNokiaData={hasNokiaData}
                      activeTab={activeTab}
                      onTransfer={handleTransfer}
                      lastServerUpdate={lastServerUpdate}
                      />
                  </div>
               ) : null
            ) : activeTab !== 'settings' && activeTab !== 'archive' && activeTab !== 'admin' && activeTab !== 'duplicates' && activeTab !== 'logs' && (activeTab !== 'search' || data.length > 0) && (activeTab !== 'recap' || recapData.length > 0) && activeTab !== 'alerts' ? (
              <div className="shrink-0 z-10 relative">
                  <ActionBar 
                  filters={activeTab === 'dashboard2' ? filters2 : filters}
                  msanOptions={msanOptions}
                  onFilterChange={(f) => activeTab === 'dashboard2' ? setFilters2(f) : setFilters(f)}
                  onImport={handleImport}
                  onExport={handleExport}
                  onReset={handleFullReset}
                  onOpenSearch={() => setModalConfig({ results: filteredData, title: (activeTab === 'dashboard2' ? filters2 : filters).sn || 'Recherche' })}
                  isLoading={isLoading}
                  lastImportDate={activeTab === 'dashboard2' ? lastImportDate2 : lastImportDate}
                  lastServerUpdate={lastServerUpdate}
                  isDataLoaded={activeTab === 'recap' ? recapData.length > 0 : (activeTab === 'dashboard2' ? data2.length > 0 : data.length > 0)}
                  simpleMode={activeTab === 'dashboard' || activeTab === 'dashboard2'}
                  hasNokiaData={hasNokiaData}
                  activeTab={activeTab}
                  onTransfer={handleTransfer}
                  />
              </div>
            ) : null}

            {activeTab !== 'settings' && activeTab !== 'archive' && activeTab !== 'admin' && activeTab !== 'duplicates' && activeTab !== 'logs' && (
                <div className="shrink-0 z-10 relative">
                    <ActiveFilters 
                        searchTerm={(activeTab === 'dashboard2' ? filters2 : filters).sn} 
                        msanFilter={(activeTab === 'dashboard2' ? filters2 : filters).msan}
                        locationFilter={(activeTab === 'dashboard2' ? filters2 : filters).location}
                        status={(activeTab === 'dashboard2' ? filters2 : filters).status}
                        onClearFilter={handleResetFilters}
                        isDataLoaded={activeTab === 'recap' ? recapData.length > 0 : (activeTab === 'dashboard2' ? data2.length > 0 : data.length > 0)}
                        activeTab={activeTab}
                    />
                </div>
            )}

            <div className="flex-grow overflow-hidden flex flex-col min-h-0 relative z-0">
                {renderMainContent()}
            </div>
          </>
        </main>
        
        <footer className="w-full text-center py-2 mt-auto border-t border-white/5 bg-slate-900/20 backdrop-blur-sm shrink-0 z-10">
          <div className="flex justify-center items-center gap-4">
              <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase opacity-70">
                  © 2026 • <span className="text-white font-bold">ONT Finder</span> <span className="text-primary font-bold">Pro</span> • Tous droits réservés
              </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;