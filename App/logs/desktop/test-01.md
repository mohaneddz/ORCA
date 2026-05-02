# Device Data Snapshot

Collected at (UTC): `2026-05-02T09:18:22.628520100+00:00`

## Device
- Hostname: DESKTOP-M7DKHI4
- OS: Windows 11 (26200)
- Kernel: 26200
- Architecture: x86_64
- CPU cores: 16
- Total memory (MB): 15553
- Uptime (seconds): 4741

## User
- Current user: Mohaned
- Username: Mohaned
- Admin estimate: Some(true)
- Local users observed: 1
- Local admins observed: 1

## Security
- Firewall status: Unknown
- Antivirus records: 1
  - Microsoft Defender: enabled=None, up_to_date=None

## Network
- Interfaces: 6
- Listening ports: 54
- Sample listening ports:
  - UDP:123
  - TCP:135
  - UDP:137
  - UDP:138
  - TCP:139
  - TCP:445
  - UDP:500
  - UDP:546
  - UDP:1900
  - UDP:4500
  - TCP:5040
  - UDP:5050
  - UDP:5353
  - UDP:5355
  - TCP:5600

## Software
- Installed entries collected: 98
- Sample software:
  - draw.io 27.0.9                                                 27.0.9             JGraph
  - Upscayl 2.15.0                                                 2.15.0             Nayam Amarshe
  - 7-Zip 24.09 (x64)                                              24.09              Igor Pavlov
  - AIMP                                                           5.40.2675          Artem Izmaylov
  - Android Studio                                                 2024.3             Google LLC
  - Audacity 3.7.7                                                 3.7.7              Audacity Team
  - BlueStacks                                                     5.22.101.2017      now.gg, Inc.
  - Cisco Packet Tracer 8.2.2 64Bit                                8.2.2.400          Cisco Systems, Inc.
  - Docker Desktop                                                 4.60.1             Docker Inc.
  - Fairlight Audio Accelerator Utility                            1.0.15             Blackmagic Design
  - GAMS 53.4.0                                                    GAMS 53.4.0        GAMS Development
  - Git                                                            2.49.0             The Git Development Community
  - Hytale Launcher                                                2026.01.11-b022ef5 Hypixel Studios Canada inc.
  - IntelliJ IDEA 2026.1                                           261.22158.277      JetBrains s.r.o.
  - Mozilla Firefox (x64 en-US)                                    150.0.1            Mozilla
  - Mozilla Thunderbird (x64 en-US)                                148.0              Mozilla
  - Mozilla Maintenance Service                                    148.0              Mozilla
  - Microsoft Corporation
  - MuseHub                                                        2.5.2.2063         Muse Group
  - Microsoft 365 Apps for enterprise - en-us                      16.0.19929.20090   Microsoft Corporation

## Processes
- Process count: 287
- Sample processes:
  - pid=6804 name=svchost.exe memory_bytes=0 path=unknown
  - pid=39748 name=posture_snapshot.exe memory_bytes=16400384 path=D:\Programming\Tauri\Hackathons\Innov\App\src-tauri\target\debug\posture_snapshot.exe
  - pid=2620 name=PowerToys.exe memory_bytes=6254592 path=C:\Users\Mohaned\AppData\Local\PowerToys\PowerToys.exe
  - pid=8068 name=sihost.exe memory_bytes=22106112 path=C:\Windows\System32\sihost.exe
  - pid=25836 name=node.exe memory_bytes=7680000 path=C:\Program Files\nodejs\node.exe
  - pid=2380 name=svchost.exe memory_bytes=0 path=unknown
  - pid=39528 name=svchost.exe memory_bytes=0 path=unknown
  - pid=4352 name=conhost.exe memory_bytes=1355776 path=C:\Windows\System32\conhost.exe
  - pid=37588 name=powershell.exe memory_bytes=83869696 path=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
  - pid=15636 name=PowerToys.Peek.UI.exe memory_bytes=6066176 path=C:\Users\Mohaned\AppData\Local\PowerToys\WinUI3Apps\PowerToys.Peek.UI.exe
  - pid=6272 name=NahimicService.exe memory_bytes=0 path=unknown
  - pid=20116 name=Code.exe memory_bytes=12763136 path=C:\Users\Mohaned\AppData\Local\Programs\Microsoft VS Code\Code.exe
  - pid=14604 name=PowerToys.AdvancedPaste.exe memory_bytes=4710400 path=C:\Users\Mohaned\AppData\Local\PowerToys\WinUI3Apps\PowerToys.AdvancedPaste.exe
  - pid=17676 name=svchost.exe memory_bytes=0 path=unknown
  - pid=9096 name=nvcontainer.exe memory_bytes=0 path=unknown
  - pid=22116 name=SystemSettings.exe memory_bytes=1765376 path=C:\Windows\ImmersiveControlPanel\SystemSettings.exe
  - pid=10800 name=svchost.exe memory_bytes=0 path=unknown
  - pid=4676 name=svchost.exe memory_bytes=0 path=unknown
  - pid=39340 name=youtube-music-desktop-app.exe memory_bytes=295690240 path=C:\Users\Mohaned\AppData\Local\youtube_music_desktop_app\app-2.0.11\youtube-music-desktop-app.exe
  - pid=908 name=smss.exe memory_bytes=0 path=unknown
  - pid=4060 name=node.exe memory_bytes=6901760 path=C:\Program Files\nodejs\node.exe
  - pid=6256 name=svchost.exe memory_bytes=0 path=unknown
  - pid=20868 name=cmd.exe memory_bytes=1454080 path=C:\Windows\System32\cmd.exe
  - pid=8296 name=svchost.exe memory_bytes=15560704 path=C:\Windows\System32\svchost.exe
  - pid=1796 name=LsaIso.exe memory_bytes=0 path=unknown

## Risk
- Score: 55
- Level: medium
- Signals:
  - No enabled antivirus signal found
  - Firewall status unknown
  - OS update status unknown
  - 52 process(es) running from Downloads/Temp/AppData

## Raw JSON

```json
{
  "collectedAtUtc": "2026-05-02T09:18:22.628520100+00:00",
  "device": {
    "hostname": "DESKTOP-M7DKHI4",
    "osName": "Windows",
    "osVersion": "11 (26200)",
    "kernelVersion": "26200",
    "architecture": "x86_64",
    "uptimeSeconds": 4741,
    "bootTimeEpoch": 1777708758,
    "hardware": {
      "architecture": "x86_64",
      "cpuCores": 16,
      "totalMemoryMb": 15553
    }
  },
  "user": {
    "currentUser": "Mohaned",
    "username": "Mohaned",
    "isAdminEstimate": true,
    "localUsers": [
      {
        "username": "Mohaned",
        "isAdmin": true
      }
    ],
    "localAdmins": [
      "Mohaned"
    ]
  },
  "security": {
    "firewallStatus": "unknown",
    "antivirus": [
      {
        "name": "Microsoft Defender",
        "enabled": null,
        "upToDate": null
      }
    ],
    "diskEncryptionEnabled": null,
    "osUpdatesCurrent": null,
    "remoteAccessExposure": null,
    "notes": [
      "Disk encryption, update status, and remote exposure are placeholders unless integrated with OS-native APIs."
    ]
  },
  "processes": [
    {
      "pid": 6804,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 39748,
      "parentPid": 38684,
      "name": "posture_snapshot.exe",
      "executablePath": "D:\\Programming\\Tauri\\Hackathons\\Innov\\App\\src-tauri\\target\\debug\\posture_snapshot.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 16400384,
      "commandLine": "target\\debug\\posture_snapshot.exe --out ../logs/info"
    },
    {
      "pid": 2620,
      "parentPid": 2508,
      "name": "PowerToys.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\PowerToys.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6254592,
      "commandLine": null
    },
    {
      "pid": 8068,
      "parentPid": 2716,
      "name": "sihost.exe",
      "executablePath": "C:\\Windows\\System32\\sihost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 22106112,
      "commandLine": "sihost.exe"
    },
    {
      "pid": 25836,
      "parentPid": 22272,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 7680000,
      "commandLine": "C:\\Program Files\\nodejs\\\\node.exe C:\\Program Files\\nodejs\\\\node_modules\\npm\\bin\\npx-cli.js @playwright/mcp@latest"
    },
    {
      "pid": 2380,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 39528,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4352,
      "parentPid": 11892,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1355776,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 37588,
      "parentPid": 41668,
      "name": "powershell.exe",
      "executablePath": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 83869696,
      "commandLine": "powershell -ExecutionPolicy Bypass -File ./scripts/run-background-tests.ps1"
    },
    {
      "pid": 15636,
      "parentPid": 8860,
      "name": "PowerToys.Peek.UI.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\WinUI3Apps\\PowerToys.Peek.UI.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6066176,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\WinUI3Apps\\PowerToys.Peek.UI.exe 2620"
    },
    {
      "pid": 6272,
      "parentPid": 1776,
      "name": "NahimicService.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 20116,
      "parentPid": 15260,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 12763136,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe c:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\extensions\\json-language-features\\server\\dist\\node\\jsonServerMain --node-ipc --clientProcessId=15260"
    },
    {
      "pid": 14604,
      "parentPid": 2620,
      "name": "PowerToys.AdvancedPaste.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\WinUI3Apps\\PowerToys.AdvancedPaste.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4710400,
      "commandLine": null
    },
    {
      "pid": 17676,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 9096,
      "parentPid": 6320,
      "name": "nvcontainer.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 22116,
      "parentPid": 1940,
      "name": "SystemSettings.exe",
      "executablePath": "C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1765376,
      "commandLine": "C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe -ServerName:microsoft.windows.immersivecontrolpanel"
    },
    {
      "pid": 10800,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4676,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 39340,
      "parentPid": 38208,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 295690240,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe --type=gpu-process --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App --gpu-preferences=SAAAAAAAAADgAAAEAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAACAAAAAAAAAAIAAAAAAAAAA== --field-trial-handle=1776,i,8440885303138786751,17765263234884207726,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708988185955192 --mojo-platform-channel-handle=1768 /prefetch:2"
    },
    {
      "pid": 908,
      "parentPid": 4,
      "name": "smss.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4060,
      "parentPid": 16444,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6901760,
      "commandLine": "C:\\Program Files\\nodejs\\\\node.exe C:\\Program Files\\nodejs\\\\node_modules\\npm\\bin\\npx-cli.js @playwright/mcp@latest"
    },
    {
      "pid": 6256,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 20868,
      "parentPid": 29304,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1454080,
      "commandLine": "C:\\WINDOWS\\system32\\cmd.exe /d /s /c playwright-mcp"
    },
    {
      "pid": 8296,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 15560704,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s WpnUserService"
    },
    {
      "pid": 1796,
      "parentPid": 1636,
      "name": "LsaIso.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 19896,
      "parentPid": 6528,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1060864,
      "commandLine": "C:\\WINDOWS\\System32\\cmd.exe"
    },
    {
      "pid": 37932,
      "parentPid": 38208,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 26279936,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe --type=crashpad-handler --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App /prefetch:4 --no-rate-limit --monitor-self-annotation=ptype=crashpad-handler --database=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App\\Crashpad --annotation=_productName=YouTube Music Desktop App --annotation=_version=2.0.11 --annotation=plat=Win64 --annotation=prod=Electron --annotation=ver=40.4.0 --initial-client-data=0x528,0x530,0x534,0x504,0x538,0x7ff735023674,0x7ff735023680,0x7ff735023690"
    },
    {
      "pid": 2704,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6352,
      "parentPid": 1776,
      "name": "spacedeskService.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 13068,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 354791424,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -parentBuildID 20260429063222 -prefsHandle 1996:44121 -prefMapHandle 2000:306351 -ipcHandle 2068 -initialChannelId {862861b2-3947-4c5d-9fc7-2e545be315a9} -parentPid 11000 -appDir C:\\Program Files\\Zen Browser\\browser - 1 gpu"
    },
    {
      "pid": 0,
      "parentPid": null,
      "name": "[System Process]",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 14108,
      "parentPid": 2620,
      "name": "PowerToys.PowerOCR.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\PowerToys.PowerOCR.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8065024,
      "commandLine": null
    },
    {
      "pid": 16648,
      "parentPid": 4292,
      "name": "Todoist.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 124223488,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Todoist --secure-schemes=sentry-ipc --bypasscsp-schemes=sentry-ipc --cors-schemes=sentry-ipc --fetch-schemes=sentry-ipc --app-user-model-id=com.todoist --app-path=C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\resources\\app.asar --enable-sandbox --video-capture-use-gpu-memory-buffer --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=4 --time-ticks-at-unix-epoch=-1777708760203687 --launch-time-ticks=105643745 --field-trial-handle=1736,i,8071470809446748431,18208560511378751850,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=DropInputEventsWhilePaintHolding,LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --pseudonymization-salt-handle=1744,i,2687594684717004520,18117209818277242904,4 --trace-process-track-uuid=3190708990060038890 --mojo-platform-channel-handle=2656 /prefetch:1"
    },
    {
      "pid": 21556,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 607416320,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 8092:44058 -prefMapHandle 8052:306351 -jsInitHandle 6896:156120 -parentBuildID 20260429063222 -ipcHandle 7580 -initialChannelId {2e6b419b-e328-4ba5-a108-77ecb5502c0b} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 15 tab"
    },
    {
      "pid": 34612,
      "parentPid": 8068,
      "name": "ShellHost.exe",
      "executablePath": "C:\\Windows\\System32\\ShellHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 174927872,
      "commandLine": "C:\\Windows\\System32\\ShellHost.exe"
    },
    {
      "pid": 37548,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2716,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 15848,
      "parentPid": 10780,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 573440,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --type=crashpad-handler --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\Raycast.Raycast_qypenmj9wpt2a\\LocalState\\EBWebView /prefetch:4 /pfhostedapp:80afeefb1e0f886f80728c3da13896e4fe5f5d3d --monitor-self-annotation=ptype=crashpad-handler --database=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\Raycast.Raycast_qypenmj9wpt2a\\LocalState\\EBWebView\\Crashpad --annotation=IsOfficialBuild=1 --annotation=channel= --annotation=chromium-version=147.0.7727.118 --annotation=exe=C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --annotation=plat=Win64 --annotation=prod=Edge WebView2 --annotation=ver=147.0.3912.86 --initial-client-data=0x180,0x184,0x188,0x15c,0x190,0x7ff8cb550d58,0x7ff8cb550d64,0x7ff8cb550d70"
    },
    {
      "pid": 3380,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 23992,
      "parentPid": 20868,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 9555968,
      "commandLine": "node C:\\Users\\Mohaned\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\.bin\\\\..\\@playwright\\mcp\\cli.js"
    },
    {
      "pid": 8860,
      "parentPid": 8784,
      "name": "explorer.exe",
      "executablePath": "C:\\Windows\\explorer.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 137592832,
      "commandLine": "C:\\WINDOWS\\Explorer.EXE"
    },
    {
      "pid": 15088,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8114176,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k LocalService -p -s NPSMSvc"
    },
    {
      "pid": 8144,
      "parentPid": 7164,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 184320,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 14640,
      "parentPid": 20380,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1101824,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 4028,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 12608,
      "parentPid": 13868,
      "name": "java.exe",
      "executablePath": "C:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\jdk\\bin\\java.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 11902976,
      "commandLine": "c:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\jdk\\bin\\java.exe -Djava.net.useSystemProxies=true -Duser.language=en -p c:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\launch;c:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\sqlcl\\launch --add-modules ALL-DEFAULT --add-opens java.prefs/java.util.prefs=oracle.dbtools.win32 --add-opens jdk.security.auth/com.sun.security.auth.module=oracle.dbtools.win32 -m com.oracle.dbtools.launch server --key-id dbtools-client-15260 --clientProcessId 15260 MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAspuy8VB4+SP7CTsWamQNO9HCbYGSgOXI9v5ApGqTH3hGEYphEz2gcd+nfiNBhDyRz/VJzbQlNDPhvDTr1Z5fzduV9oSZBH0XmqWQnPW+W908CfWQy9RM/Hk11eeabnuIoOE+8Qqpdtw+4HPOekoO/vDO0UbM7yKS62U+yZ+01TTsKXUo2bjgmeVVZhNWsfG8g/EjoQBSnZQe+XFaAxJ9laHthqIc3Y7F0+hR2NcgDkKhOYFEUxsJmGAcsuoUgIUeFAY96+yQ2qa4OI6V5f/spwU+21IePYMUtA6wxyK/WceAQ6VLrn3Mnp1xK9WWYRqkb+4snQ2LjBjNZDGVmRYxyQIDAQAB"
    },
    {
      "pid": 10380,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 11088,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 21180416,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US --service-sandbox-type=none --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708989122997041 --mojo-platform-channel-handle=2060 /prefetch:11"
    },
    {
      "pid": 11204,
      "parentPid": 8860,
      "name": "Simple PrayerTime Reminder.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 22515712,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe --hidden"
    },
    {
      "pid": 6264,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 9032,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4688,
      "parentPid": 5524,
      "name": "audiodg.exe",
      "executablePath": "C:\\Windows\\System32\\audiodg.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 21426176,
      "commandLine": null
    },
    {
      "pid": 2568,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 18584,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 7909376,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 4580:33482 -prefMapHandle 4584:306351 -jsInitHandle 4588:156120 -parentBuildID 20260429063222 -ipcHandle 4592 -initialChannelId {29c84e1e-2bf7-4b92-a788-be2e1fdf9691} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 5 tab"
    },
    {
      "pid": 19820,
      "parentPid": 6528,
      "name": "OpenConsole.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\node_modules\\node-pty\\build\\Release\\conpty\\OpenConsole.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3489792,
      "commandLine": "c:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\node_modules\\node-pty\\build\\Release\\conpty\\OpenConsole.exe --headless --width 187 --height 9 --signal 0x558 --server 0x554"
    },
    {
      "pid": 5524,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 34784,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 45453312,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 8424:44221 -prefMapHandle 6236:306351 -jsInitHandle 3184:156120 -parentBuildID 20260429063222 -ipcHandle 6588 -initialChannelId {3d02de35-56d4-4e1f-92f0-a217602ac11c} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 105 tab"
    },
    {
      "pid": 19640,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3477504,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -parentBuildID 20260429063222 -sandboxingKind 0 -prefsHandle 6064:54693 -prefMapHandle 6032:306351 -ipcHandle 5424 -initialChannelId {1b24aaa8-cc8b-4832-904e-a18d64965781} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 8 utility"
    },
    {
      "pid": 1976,
      "parentPid": 1704,
      "name": "fontdrvhost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4492,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5228,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5184,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8458240,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k DevicesFlow -s DevicesFlowUserSvc"
    },
    {
      "pid": 11236,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 2629632,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k PenService -s PenService"
    },
    {
      "pid": 17300,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 500555776,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 5948:44221 -prefMapHandle 7268:306351 -jsInitHandle 8548:156120 -parentBuildID 20260429063222 -ipcHandle 11112 -initialChannelId {93111b4a-65d7-46dd-ab87-2a369b18fd92} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 104 tab"
    },
    {
      "pid": 40188,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 35950592,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 10568:44220 -prefMapHandle 6472:306351 -jsInitHandle 10640:156120 -parentBuildID 20260429063222 -ipcHandle 7980 -initialChannelId {a1b8de2c-f351-41c8-accb-3c3ed86adf9a} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 136 tab"
    },
    {
      "pid": 1940,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4132,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 14500,
      "parentPid": 2620,
      "name": "PowerToys.ColorPickerUI.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\PowerToys.ColorPickerUI.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 18239488,
      "commandLine": null
    },
    {
      "pid": 19652,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 38868,
      "parentPid": 38208,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 100462592,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App --enable-sandbox --app-user-model-id=com.squirrel.youtube_music_desktop_app.youtube-music-desktop-app --app-path=C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\resources\\app.asar --enable-sandbox --video-capture-use-gpu-memory-buffer --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=4 --time-ticks-at-unix-epoch=-1777708758743274 --launch-time-ticks=4347485060 --field-trial-handle=1776,i,8440885303138786751,17765263234884207726,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708990060038890 --mojo-platform-channel-handle=2888 /prefetch:1"
    },
    {
      "pid": 5680,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 20172,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6368,
      "parentPid": 1776,
      "name": "MpDefenderCoreService.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 30156,
      "parentPid": 27572,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 11833344,
      "commandLine": "node C:\\Users\\Mohaned\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\.bin\\\\..\\@playwright\\mcp\\cli.js"
    },
    {
      "pid": 11660,
      "parentPid": 10840,
      "name": "aw-watcher-afk.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-watcher-afk\\aw-watcher-afk.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 11829248,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-watcher-afk\\aw-watcher-afk.exe"
    },
    {
      "pid": 5520,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 9636,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 280,
      "parentPid": 4,
      "name": "Registry",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2404,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 3576,
      "parentPid": 2096,
      "name": "conhost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 16236,
      "parentPid": 1940,
      "name": "TextInputHost.exe",
      "executablePath": "C:\\Windows\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\TextInputHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 34455552,
      "commandLine": "C:\\WINDOWS\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\TextInputHost.exe -ServerName:InputApp.AppXk0k6mrh4r2q0ct33a9wgbez0x7v9cz5y.mca"
    },
    {
      "pid": 24504,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 380416000,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 8912:44058 -prefMapHandle 8908:306351 -jsInitHandle 8928:156120 -parentBuildID 20260429063222 -ipcHandle 9136 -initialChannelId {4761d793-9725-43de-803b-635dd54840c7} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 26 tab"
    },
    {
      "pid": 30056,
      "parentPid": 20380,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1568768,
      "commandLine": "cmd.exe /e:ON /v:OFF /d /c C:\\Program Files\\nodejs\\npx.cmd @playwright/mcp@latest"
    },
    {
      "pid": 8392,
      "parentPid": 2508,
      "name": "taskhostw.exe",
      "executablePath": "C:\\Windows\\System32\\taskhostw.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8495104,
      "commandLine": "taskhostw.exe {222A245B-E637-4AE9-A93F-A59CA119A75E}"
    },
    {
      "pid": 16508,
      "parentPid": 16048,
      "name": "Raycast.UIAccess.exe",
      "executablePath": "C:\\Program Files\\WindowsApps\\Raycast.Raycast_0.56.0.0_x64__qypenmj9wpt2a\\Raycast\\Raycast.UIAccess.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1818624,
      "commandLine": null
    },
    {
      "pid": 11892,
      "parentPid": 10840,
      "name": "aw-server.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-server\\aw-server.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 19435520,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-server\\aw-server.exe"
    },
    {
      "pid": 3204,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 7184,
      "parentPid": 4292,
      "name": "Todoist.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 9920512,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe --type=gpu-process --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Todoist --gpu-preferences=SAAAAAAAAADgAAAEAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAACAAAAAAAAAAIAAAAAAAAAA== --field-trial-handle=1736,i,8071470809446748431,18208560511378751850,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=DropInputEventsWhilePaintHolding,LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --pseudonymization-salt-handle=1744,i,2687594684717004520,18117209818277242904,4 --trace-process-track-uuid=3190708988185955192 --mojo-platform-channel-handle=1720 /prefetch:2"
    },
    {
      "pid": 4544,
      "parentPid": 3160,
      "name": "dasHost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 10216,
      "parentPid": 1940,
      "name": "unsecapp.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 38208,
      "parentPid": 38060,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 124178432,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe"
    },
    {
      "pid": 6296,
      "parentPid": 1776,
      "name": "RtkBtManServ.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6604,
      "parentPid": 4292,
      "name": "Todoist.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 30093312,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Todoist --secure-schemes=sentry-ipc --bypasscsp-schemes=sentry-ipc --cors-schemes=sentry-ipc --fetch-schemes=sentry-ipc --app-user-model-id=com.todoist --app-path=C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\resources\\app.asar --enable-sandbox --video-capture-use-gpu-memory-buffer --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=6 --time-ticks-at-unix-epoch=-1777708760203687 --launch-time-ticks=107726691 --field-trial-handle=1736,i,8071470809446748431,18208560511378751850,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=DropInputEventsWhilePaintHolding,LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --pseudonymization-salt-handle=1744,i,2687594684717004520,18117209818277242904,4 --trace-process-track-uuid=3190708991934122588 --mojo-platform-channel-handle=4072 /prefetch:1"
    },
    {
      "pid": 23228,
      "parentPid": 15260,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 16953344,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe c:\\Users\\Mohaned\\.vscode\\extensions\\kisstkondoros.vscode-gutter-preview-0.32.2\\dist\\server.js --node-ipc --clientProcessId=15260"
    },
    {
      "pid": 5856,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6288,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 13592,
      "parentPid": 2620,
      "name": "PowerToys.AlwaysOnTop.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\PowerToys.AlwaysOnTop.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 450560,
      "commandLine": null
    },
    {
      "pid": 10960,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 32968,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 41092,
      "parentPid": 38208,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 78266368,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe --type=utility --utility-sub-type=audio.mojom.AudioService --lang=en-US --service-sandbox-type=audio --video-capture-use-gpu-memory-buffer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App --enable-sandbox --field-trial-handle=1776,i,8440885303138786751,17765263234884207726,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708992871164437 --mojo-platform-channel-handle=4400 /prefetch:12"
    },
    {
      "pid": 3316,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3182592,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=crashpad-handler --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code /prefetch:4 --no-rate-limit --monitor-self-annotation=ptype=crashpad-handler --database=C:\\Users\\Mohaned\\AppData\\Roaming\\Code\\Crashpad --url=appcenter://code?aid=a4e3233c-699c-46ec-b4f4-9c2a77254662&uid=79882d33-736e-4188-a3ba-8d45ecb91099&iid=79882d33-736e-4188-a3ba-8d45ecb91099&sid=79882d33-736e-4188-a3ba-8d45ecb91099 --annotation=_companyName=Microsoft --annotation=_productName=VSCode --annotation=_version=1.118.1 --annotation=plat=Win64 --annotation=prod=Electron --annotation=ver=39.8.8 --initial-client-data=0x4ec,0x4f0,0x4f4,0x4e8,0x4f8,0x7ff79763922c,0x7ff797639238,0x7ff797639248"
    },
    {
      "pid": 4572,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 20380,
      "parentPid": 15260,
      "name": "codex.exe",
      "executablePath": "C:\\Users\\Mohaned\\.vscode\\extensions\\openai.chatgpt-26.429.30905-win32-x64\\bin\\windows-x86_64\\codex.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 89247744,
      "commandLine": "c:\\Users\\Mohaned\\.vscode\\extensions\\openai.chatgpt-26.429.30905-win32-x64\\bin\\windows-x86_64\\codex.exe app-server --analytics-default-enabled"
    },
    {
      "pid": 15856,
      "parentPid": 2620,
      "name": "PowerToys.FancyZones.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\PowerToys.FancyZones.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4239360,
      "commandLine": null
    },
    {
      "pid": 20304,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 2842624,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup"
    },
    {
      "pid": 6380,
      "parentPid": 1776,
      "name": "OfficeClickToRun.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6192,
      "parentPid": 6280,
      "name": "AggregatorHost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 13728,
      "parentPid": 13096,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 17289216,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US --service-sandbox-type=none --noerrdialogs --user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; Cortana 1.18.9.23723; 10.0.0.0.26200.8246) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.26200 IsWebView2/True (WebView2Version 147.0.3912.86) --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView --webview-exe-name=SearchHost.exe --webview-exe-version=2126.5604.40.0 --embedded-browser-webview=1 --always-read-main-dll --metrics-shmem-handle=2436,i,2244943058492873445,15100521305428414790,524288 --field-trial-handle=2028,i,2801751961654966079,10272391875469521625,262144 --enable-features=msEdgeFluentOverlayScrollbar --disable-features=msSmartScreenProtection --variations-seed-version --pseudonymization-salt-handle=2060,i,15445996603034493709,14482896526458014625,4 --trace-process-track-uuid=3190708989122997041 --mojo-platform-channel-handle=2408 /prefetch:11 /pfhostedapp:2a82e83d24f46d0980bfac30597d2b0d77c72d53"
    },
    {
      "pid": 32228,
      "parentPid": 6528,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4136960,
      "commandLine": "C:\\WINDOWS\\System32\\cmd.exe"
    },
    {
      "pid": 3528,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 15832,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 7131136,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 3776:44332 -prefMapHandle 3780:306351 -jsInitHandle 3784:156120 -parentBuildID 20260429063222 -ipcHandle 3792 -initialChannelId {af1a3253-a54c-4432-9112-f3c6167a8f87} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 3 tab"
    },
    {
      "pid": 29196,
      "parentPid": 27284,
      "name": "python.exe",
      "executablePath": "C:\\Users\\Mohaned\\miniconda3\\python.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 64557056,
      "commandLine": "C:\\Users\\Mohaned\\miniconda3\\python.exe manage.py runserver"
    },
    {
      "pid": 26736,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 36519936,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 6472:44220 -prefMapHandle 10700:306351 -jsInitHandle 5932:156120 -parentBuildID 20260429063222 -ipcHandle 10372 -initialChannelId {18d10b29-280d-47a3-9ca3-f035a2149806} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 138 tab"
    },
    {
      "pid": 9040,
      "parentPid": 1940,
      "name": "WmiPrvSE.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 7804,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 40624,
      "parentPid": 38616,
      "name": "pnpm.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\pnpm\\pnpm.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 58880000,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\pnpm\\pnpm.exe run test:bg"
    },
    {
      "pid": 4420,
      "parentPid": 4292,
      "name": "Todoist.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 22085632,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US --service-sandbox-type=none --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Todoist --secure-schemes=sentry-ipc --bypasscsp-schemes=sentry-ipc --cors-schemes=sentry-ipc --fetch-schemes=sentry-ipc --field-trial-handle=1736,i,8071470809446748431,18208560511378751850,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=DropInputEventsWhilePaintHolding,LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --pseudonymization-salt-handle=1744,i,2687594684717004520,18117209818277242904,4 --trace-process-track-uuid=3190708989122997041 --mojo-platform-channel-handle=2072 /prefetch:11"
    },
    {
      "pid": 30132,
      "parentPid": 20380,
      "name": "powershell.exe",
      "executablePath": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 33394688,
      "commandLine": "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand JABFAHIAcgBvAHIAQQBjAHQAaQBvAG4AUAByAGUAZgBlAHIAZQBuAGMAZQAgAD0AIAAnAFMAdABvAHAAJwANAAoAJABQAHIAbwBnAHIAZQBzAHMAUAByAGUAZgBlAHIAZQBuAGMAZQAgAD0AIAAnAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAJwANAAoADQAKACMAIABMAG8AbgBnAC0AbABpAHYAZQBkACAAUABvAHcAZQByAFMAaABlAGwAbAAgAEEAUwBUACAAcABhAHIAcwBlAHIAIAB1AHMAZQBkACAAYgB5ACAAdABoAGUAIABSAHUAcwB0ACAAYwBvAG0AbQBhAG4AZAAtAHMAYQBmAGUAdAB5ACAAbABhAHkAZQByACAAbwBuACAAVwBpAG4AZABvAHcAcwAuAA0ACgAjACAAVABoAGUAIABjAGEAbABsAGUAcgAgAHMAdABhAHIAdABzACAAbwBuAGUAIABjAGgAaQBsAGQAIABwAHIAbwBjAGUAcwBzACAAcABlAHIAIABQAG8AdwBlAHIAUwBoAGUAbABsACAAZQB4AGUAYwB1AHQAYQBiAGwAZQAgAHYAYQByAGkAYQBuAHQAIABhAG4AZAAgAHQAaABlAG4AIABzAGUAbgBkAHMADQAKACMAIABuAGUAdwBsAGkAbgBlAC0AZABlAGwAaQBtAGkAdABlAGQAIABKAFMATwBOACAAcgBlAHEAdQBlAHMAdABzACAAbwB2AGUAcgAgAHMAdABkAGkAbgA6AA0ACgAjACAAIAAgAHsAIAAiAGkAZAAiADoAIAA8AHUANgA0AD4ALAAgACIAcABhAHkAbABvAGEAZAAiADoAIAAiADwAYgBhAHMAZQA2ADQALQBlAG4AYwBvAGQAZQBkACAAVQBUAEYALQAxADYATABFACAAcwBjAHIAaQBwAHQAPgAiACAAfQANAAoAIwAgAFcAZQAgAGEAbgBzAHcAZQByACAAdwBpAHQAaAAgAG8AbgBlACAAYwBvAG0AcABhAGMAdAAgAEoAUwBPAE4AIABsAGkAbgBlACAAcABlAHIAIAByAGUAcQB1AGUAcwB0ADoADQAKACMAIAAgACAAewAgACIAaQBkACIAOgAgADwAcwBhAG0AZQA+ACwAIAAiAHMAdABhAHQAdQBzACIAOgAgACIAbwBrACIALAAgACIAYwBvAG0AbQBhAG4AZABzACIAOgAgAFsAWwAiAEcAZQB0AC0AQwBvAG4AdABlAG4AdAAiACwAIAAiAGYAbwBvAC4AdAB4AHQAIgBdAF0AIAB9AA0ACgAjACAAbwByADoADQAKACMAIAAgACAAewAgACIAaQBkACIAOgAgADwAcwBhAG0AZQA+ACwAIAAiAHMAdABhAHQAdQBzACIAOgAgACIAcABhAHIAcwBlAF8AZgBhAGkAbABlAGQAIgAgAHwAIAAiAHAAYQByAHMAZQBfAGUAcgByAG8AcgBzACIAIAB8ACAAIgB1AG4AcwB1AHAAcABvAHIAdABlAGQAIgAgAH0ADQAKACMADQAKACMAIAAiAHUAbgBzAHUAcABwAG8AcgB0AGUAZAAiACAAaQBzACAAaQBuAHQAZQBuAHQAaQBvAG4AYQBsADoAIABpAHQAIABtAGUAYQBuAHMAIAB0AGgAZQAgAHMAYwByAGkAcAB0ACAAcABhAHIAcwBlAGQAIABzAHUAYwBjAGUAcwBzAGYAdQBsAGwAeQAsACAAYgB1AHQAIAB0AGgAZQAgAEEAUwBUAA0ACgAjACAAaQBuAGMAbAB1AGQAZQBkACAAYwBvAG4AcwB0AHIAdQBjAHQAcwAgAHQAaABhAHQAIAB3AGUAIABjAG8AbgBzAGUAcgB2AGEAdABpAHYAZQBsAHkAIAByAGUAZgB1AHMAZQAgAHQAbwAgAGwAbwB3AGUAcgAgAGkAbgB0AG8AIABhAHIAZwB2AC0AbABpAGsAZQAgAGMAbwBtAG0AYQBuAGQAIAB3AG8AcgBkAHMALgANAAoAIwAgAFQAaABlACAAUgB1AHMAdAAgAHMAaQBkAGUAIAB0AHIAZQBhAHQAcwAgAHQAaABhAHQAIAB0AGgAZQAgAHMAYQBtAGUAIAB3AGEAeQAgAGEAcwAgAGEAbgAgAHUAbgBzAGEAZgBlACAAYwBvAG0AbQBhAG4AZAAuAA0ACgANAAoAIwAgAFUAcwBlACAAQgBPAE0ALQBmAHIAZQBlACAAVQBUAEYALQA4ACAAbwBuACAAdABoAGUAIABwAHIAbwB0AG8AYwBvAGwAIABzAHQAcgBlAGEAbQAgAHMAbwAgAFIAdQBzAHQAIABzAGUAZQBzACAAYwBsAGUAYQBuACAASgBTAE8ATgAgAGwAaQBuAGUAcwAgAHcAaQB0AGgAIABuAG8ADQAKACMAIABsAGUAYQBkAGkAbgBnACAAQgBPAE0AIABiAHkAdABlAHMAIABvAG4AIAB0AGgAZQAgAGYAaQByAHMAdAAgAHIAZQBzAHAAbwBuAHMAZQAuAA0ACgAkAHUAdABmADgAIAA9ACAAWwBTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBVAFQARgA4AEUAbgBjAG8AZABpAG4AZwBdADoAOgBuAGUAdwAoACQAZgBhAGwAcwBlACkADQAKACQAcwB0AGQAaQBuACAAPQAgAFsAUwB5AHMAdABlAG0ALgBJAE8ALgBTAHQAcgBlAGEAbQBSAGUAYQBkAGUAcgBdADoAOgBuAGUAdwAoAFsAQwBvAG4AcwBvAGwAZQBdADoAOgBPAHAAZQBuAFMAdABhAG4AZABhAHIAZABJAG4AcAB1AHQAKAApACwAIAAkAHUAdABmADgALAAgACQAZgBhAGwAcwBlACkADQAKACQAcwB0AGQAbwB1AHQAIAA9ACAAWwBTAHkAcwB0AGUAbQAuAEkATwAuAFMAdAByAGUAYQBtAFcAcgBpAHQAZQByAF0AOgA6AG4AZQB3ACgAWwBDAG8AbgBzAG8AbABlAF0AOgA6AE8AcABlAG4AUwB0AGEAbgBkAGEAcgBkAE8AdQB0AHAAdQB0ACgAKQAsACAAJAB1AHQAZgA4ACkADQAKACQAcwB0AGQAbwB1AHQALgBBAHUAdABvAEYAbAB1AHMAaAAgAD0AIAAkAHQAcgB1AGUADQAKAA0ACgBmAHUAbgBjAHQAaQBvAG4AIABJAG4AdgBvAGsAZQAtAFAAYQByAHMAZQBSAGUAcQB1AGUAcwB0ACAAewANAAoAIAAgACAAIABwAGEAcgBhAG0AKAAkAFIAZQBxAHUAZQBzAHQASQBkACwAIAAkAFMAbwB1AHIAYwBlACkADQAKAA0ACgAgACAAIAAgACQAdABvAGsAZQBuAHMAIAA9ACAAJABuAHUAbABsAA0ACgAgACAAIAAgACQAZQByAHIAbwByAHMAIAA9ACAAJABuAHUAbABsAA0ACgANAAoAIAAgACAAIAAkAGEAcwB0ACAAPQAgACQAbgB1AGwAbAANAAoAIAAgACAAIAB0AHIAeQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAkAGEAcwB0ACAAPQAgAFsAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAFAAYQByAHMAZQByAF0AOgA6AFAAYQByAHMAZQBJAG4AcAB1AHQAKAANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJABTAG8AdQByAGMAZQAsAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIABbAHIAZQBmAF0AJAB0AG8AawBlAG4AcwAsAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIABbAHIAZQBmAF0AJABlAHIAcgBvAHIAcwANAAoAIAAgACAAIAAgACAAIAAgACkADQAKACAAIAAgACAAfQAgAGMAYQB0AGMAaAAgAHsADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgAEAAewAgAGkAZAAgAD0AIAAkAFIAZQBxAHUAZQBzAHQASQBkADsAIABzAHQAYQB0AHUAcwAgAD0AIAAnAHAAYQByAHMAZQBfAGYAYQBpAGwAZQBkACcAIAB9AA0ACgAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgAGkAZgAgACgAJABlAHIAcgBvAHIAcwAuAEMAbwB1AG4AdAAgAC0AZwB0ACAAMAApACAAewANAAoAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAQAB7ACAAaQBkACAAPQAgACQAUgBlAHEAdQBlAHMAdABJAGQAOwAgAHMAdABhAHQAdQBzACAAPQAgACcAcABhAHIAcwBlAF8AZQByAHIAbwByAHMAJwAgAH0ADQAKACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAIwAgAE8AbgBsAHkAIABhAGMAYwBlAHAAdAAgAEEAUwBUACAAcwBoAGEAcABlAHMAIAB3AGUAIABjAGEAbgAgAGYAbABhAHQAdABlAG4AIABpAG4AdABvACAAYQAgAGwAaQBzAHQAIABvAGYAIABhAHIAZwB2AC0AbABpAGsAZQAgAGMAbwBtAG0AYQBuAGQAIAB3AG8AcgBkAHMALgANAAoAIAAgACAAIAAjACAAQQBuAHkAdABoAGkAbgBnACAAbQBvAHIAZQAgAGQAeQBuAGEAbQBpAGMAIAB0AGgAYQBuACAAdABoAGEAdAAgAGIAZQBjAG8AbQBlAHMAIAAiAHUAbgBzAHUAcABwAG8AcgB0AGUAZAAiACAAaQBuAHMAdABlAGEAZAAgAG8AZgAgAGIAZQBpAG4AZwAgAGcAdQBlAHMAcwBlAGQAIABhAHQALgANAAoAIAAgACAAIAAkAGMAbwBtAG0AYQBuAGQAcwAgAD0AIABbAFMAeQBzAHQAZQBtAC4AQwBvAGwAbABlAGMAdABpAG8AbgBzAC4AQQByAHIAYQB5AEwAaQBzAHQAXQA6ADoAbgBlAHcAKAApAA0ACgANAAoAIAAgACAAIABmAG8AcgBlAGEAYwBoACAAKAAkAHMAdABhAHQAZQBtAGUAbgB0ACAAaQBuACAAJABhAHMAdAAuAEUAbgBkAEIAbABvAGMAawAuAFMAdABhAHQAZQBtAGUAbgB0AHMAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIABpAGYAIAAoAC0AbgBvAHQAIAAoAEEAZABkAC0AQwBvAG0AbQBhAG4AZABzAEYAcgBvAG0AUABpAHAAZQBsAGkAbgBlAEIAYQBzAGUAIAAkAHMAdABhAHQAZQBtAGUAbgB0ACAAJABjAG8AbQBtAGEAbgBkAHMAKQApACAAewANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJABjAG8AbQBtAGEAbgBkAHMAIAA9ACAAJABuAHUAbABsAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIABiAHIAZQBhAGsADQAKACAAIAAgACAAIAAgACAAIAB9AA0ACgAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgAGkAZgAgACgAJABjAG8AbQBtAGEAbgBkAHMAIAAtAG4AZQAgACQAbgB1AGwAbAApACAAewANAAoAIAAgACAAIAAgACAAIAAgACQAbgBvAHIAbQBhAGwAaQB6AGUAZAAgAD0AIABbAFMAeQBzAHQAZQBtAC4AQwBvAGwAbABlAGMAdABpAG8AbgBzAC4AQQByAHIAYQB5AEwAaQBzAHQAXQA6ADoAbgBlAHcAKAApAA0ACgAgACAAIAAgACAAIAAgACAAZgBvAHIAZQBhAGMAaAAgACgAJABjAG0AZAAgAGkAbgAgACQAYwBvAG0AbQBhAG4AZABzACkAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAjACAAQwBvAG4AdgBlAHIAdAAgAGUAdgBlAHIAeQAgAHMAdQBjAGMAZQBzAHMAZgB1AGwAIABwAGEAcgBzAGUAIAByAGUAcwB1AGwAdAAgAHQAbwAgAGEAbgAgAGEAcgByAGEAeQAtAG8AZgAtAGEAcgByAGEAeQBzACAAcwBoAGEAcABlACAAcwBvACAAdABoAGUAIABSAHUAcwB0AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAjACAAcwBpAGQAZQAgAGMAYQBuACAAZABlAHMAZQByAGkAYQBsAGkAegBlACAAbwBuAGUAIAB1AG4AaQBmAG8AcgBtACAAcgBlAHAAcgBlAHMAZQBuAHQAYQB0AGkAbwBuAC4ADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJABjAG0AZAAgAC0AaQBzACAAWwBzAHQAcgBpAG4AZwBdACkAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACQAbgB1AGwAbAAgAD0AIAAkAG4AbwByAG0AYQBsAGkAegBlAGQALgBBAGQAZAAoAEAAKAAkAGMAbQBkACkAKQANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIABjAG8AbgB0AGkAbgB1AGUADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIABpAGYAIAAoACQAYwBtAGQAIAAtAGkAcwAgAFsAUwB5AHMAdABlAG0ALgBBAHIAcgBhAHkAXQAgAC0AbwByACAAJABjAG0AZAAgAC0AaQBzACAAWwBTAHkAcwB0AGUAbQAuAEMAbwBsAGwAZQBjAHQAaQBvAG4AcwAuAEkARQBuAHUAbQBlAHIAYQBiAGwAZQBdACkAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACQAbgB1AGwAbAAgAD0AIAAkAG4AbwByAG0AYQBsAGkAegBlAGQALgBBAGQAZAAoAEAAKAAkAGMAbQBkACkAKQANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIABjAG8AbgB0AGkAbgB1AGUADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAkAG4AbwByAG0AYQBsAGkAegBlAGQAIAA9ACAAJABuAHUAbABsAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIABiAHIAZQBhAGsADQAKACAAIAAgACAAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAAgACAAIAAgACQAYwBvAG0AbQBhAG4AZABzACAAPQAgACQAbgBvAHIAbQBhAGwAaQB6AGUAZAANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIABpAGYAIAAoACQAYwBvAG0AbQBhAG4AZABzACAALQBlAHEAIAAkAG4AdQBsAGwAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgAEAAewAgAGkAZAAgAD0AIAAkAFIAZQBxAHUAZQBzAHQASQBkADsAIABzAHQAYQB0AHUAcwAgAD0AIAAnAHUAbgBzAHUAcABwAG8AcgB0AGUAZAAnACAAfQANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAByAGUAdAB1AHIAbgAgAEAAewAgAGkAZAAgAD0AIAAkAFIAZQBxAHUAZQBzAHQASQBkADsAIABzAHQAYQB0AHUAcwAgAD0AIAAnAG8AawAnADsAIABjAG8AbQBtAGEAbgBkAHMAIAA9ACAAJABjAG8AbQBtAGEAbgBkAHMAIAB9AA0ACgB9AA0ACgANAAoAZgB1AG4AYwB0AGkAbwBuACAAVwByAGkAdABlAC0AUgBlAHMAcABvAG4AcwBlACAAewANAAoAIAAgACAAIABwAGEAcgBhAG0AKAAkAFIAZQBzAHAAbwBuAHMAZQApAA0ACgANAAoAIAAgACAAIAAkAHMAdABkAG8AdQB0AC4AVwByAGkAdABlAEwAaQBuAGUAKAAoACQAUgBlAHMAcABvAG4AcwBlACAAfAAgAEMAbwBuAHYAZQByAHQAVABvAC0ASgBzAG8AbgAgAC0AQwBvAG0AcAByAGUAcwBzACAALQBEAGUAcAB0AGgAIAAzACkAKQANAAoAfQANAAoADQAKAGYAdQBuAGMAdABpAG8AbgAgAEMAbwBuAHYAZQByAHQALQBDAG8AbQBtAGEAbgBkAEUAbABlAG0AZQBuAHQAIAB7AA0ACgAgACAAIAAgAHAAYQByAGEAbQAoACQAZQBsAGUAbQBlAG4AdAApAA0ACgANAAoAIAAgACAAIAAjACAAQQBjAGMAZQBwAHQAIABvAG4AbAB5ACAAbABpAHQAZQByAGEAbAAtAGkAcwBoACAAYwBvAG0AbQBhAG4AZAAgAGUAbABlAG0AZQBuAHQAcwAuACAAVgBhAHIAaQBhAGIAbABlACAAZQB4AHAAYQBuAHMAaQBvAG4ALAAgAHMAdQBiAGUAeABwAHIAZQBzAHMAaQBvAG4AcwAsACAAcwBwAGwAYQB0AHMALAANAAoAIAAgACAAIAAjACAAYQBuAGQAIABvAHQAaABlAHIAIABkAHkAbgBhAG0AaQBjACAAZgBvAHIAbQBzACAAcgBlAHQAdQByAG4AIAAkAG4AdQBsAGwAIABzAG8AIAB0AGgAZQAgAHcAaABvAGwAZQAgAHIAZQBxAHUAZQBzAHQAIABiAGUAYwBvAG0AZQBzACAAdQBuAHMAdQBwAHAAbwByAHQAZQBkAC4ADQAKACAAIAAgACAAaQBmACAAKAAkAGUAbABlAG0AZQBuAHQAIAAtAGkAcwAgAFsAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAFMAdAByAGkAbgBnAEMAbwBuAHMAdABhAG4AdABFAHgAcAByAGUAcwBzAGkAbwBuAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgAEAAKAAkAGUAbABlAG0AZQBuAHQALgBWAGEAbAB1AGUAKQANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIABpAGYAIAAoACQAZQBsAGUAbQBlAG4AdAAgAC0AaQBzACAAWwBTAHkAcwB0AGUAbQAuAE0AYQBuAGEAZwBlAG0AZQBuAHQALgBBAHUAdABvAG0AYQB0AGkAbwBuAC4ATABhAG4AZwB1AGEAZwBlAC4ARQB4AHAAYQBuAGQAYQBiAGwAZQBTAHQAcgBpAG4AZwBFAHgAcAByAGUAcwBzAGkAbwBuAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIABpAGYAIAAoACQAZQBsAGUAbQBlAG4AdAAuAE4AZQBzAHQAZQBkAEUAeABwAHIAZQBzAHMAaQBvAG4AcwAuAEMAbwB1AG4AdAAgAC0AZwB0ACAAMAApACAAewANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAcgBlAHQAdQByAG4AIAAkAG4AdQBsAGwADQAKACAAIAAgACAAIAAgACAAIAB9AA0ACgAgACAAIAAgACAAIAAgACAAcgBlAHQAdQByAG4AIABAACgAJABlAGwAZQBtAGUAbgB0AC4AVgBhAGwAdQBlACkADQAKACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAaQBmACAAKAAkAGUAbABlAG0AZQBuAHQAIAAtAGkAcwAgAFsAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAEMAbwBuAHMAdABhAG4AdABFAHgAcAByAGUAcwBzAGkAbwBuAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgAEAAKAAkAGUAbABlAG0AZQBuAHQALgBWAGEAbAB1AGUALgBUAG8AUwB0AHIAaQBuAGcAKAApACkADQAKACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAaQBmACAAKAAkAGUAbABlAG0AZQBuAHQAIAAtAGkAcwAgAFsAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAEMAbwBtAG0AYQBuAGQAUABhAHIAYQBtAGUAdABlAHIAQQBzAHQAXQApACAAewANAAoAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJABlAGwAZQBtAGUAbgB0AC4AQQByAGcAdQBtAGUAbgB0ACAALQBlAHEAIAAkAG4AdQBsAGwAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAQAAoACcALQAnACAAKwAgACQAZQBsAGUAbQBlAG4AdAAuAFAAYQByAGEAbQBlAHQAZQByAE4AYQBtAGUAKQANAAoAIAAgACAAIAAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgACAAIAAgACAAaQBmACAAKAAkAGUAbABlAG0AZQBuAHQALgBBAHIAZwB1AG0AZQBuAHQAIAAtAGkAcwAgAFsAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAFMAdAByAGkAbgBnAEMAbwBuAHMAdABhAG4AdABFAHgAcAByAGUAcwBzAGkAbwBuAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAQAAoACcALQAnACAAKwAgACQAZQBsAGUAbQBlAG4AdAAuAFAAYQByAGEAbQBlAHQAZQByAE4AYQBtAGUALAAgACQAZQBsAGUAbQBlAG4AdAAuAEEAcgBnAHUAbQBlAG4AdAAuAFYAYQBsAHUAZQApAA0ACgAgACAAIAAgACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAIAAgACAAIABpAGYAIAAoACQAZQBsAGUAbQBlAG4AdAAuAEEAcgBnAHUAbQBlAG4AdAAgAC0AaQBzACAAWwBTAHkAcwB0AGUAbQAuAE0AYQBuAGEAZwBlAG0AZQBuAHQALgBBAHUAdABvAG0AYQB0AGkAbwBuAC4ATABhAG4AZwB1AGEAZwBlAC4AQwBvAG4AcwB0AGEAbgB0AEUAeABwAHIAZQBzAHMAaQBvAG4AQQBzAHQAXQApACAAewANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAcgBlAHQAdQByAG4AIABAACgAJwAtACcAIAArACAAJABlAGwAZQBtAGUAbgB0AC4AUABhAHIAYQBtAGUAdABlAHIATgBhAG0AZQAsACAAJABlAGwAZQBtAGUAbgB0AC4AQQByAGcAdQBtAGUAbgB0AC4AVgBhAGwAdQBlAC4AVABvAFMAdAByAGkAbgBnACgAKQApAA0ACgAgACAAIAAgACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAbgB1AGwAbAANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAbgB1AGwAbAANAAoAfQANAAoADQAKAGYAdQBuAGMAdABpAG8AbgAgAEMAbwBuAHYAZQByAHQALQBQAGkAcABlAGwAaQBuAGUARQBsAGUAbQBlAG4AdAAgAHsADQAKACAAIAAgACAAcABhAHIAYQBtACgAJABlAGwAZQBtAGUAbgB0ACkADQAKAA0ACgAgACAAIAAgAGkAZgAgACgAJABlAGwAZQBtAGUAbgB0ACAALQBpAHMAIABbAFMAeQBzAHQAZQBtAC4ATQBhAG4AYQBnAGUAbQBlAG4AdAAuAEEAdQB0AG8AbQBhAHQAaQBvAG4ALgBMAGEAbgBnAHUAYQBnAGUALgBDAG8AbQBtAGEAbgBkAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAjACAAUgBlAGQAaQByAGUAYwB0AGkAbwBuAHMAIABhAG4AZAAgAGkAbgB2AG8AYwBhAHQAaQBvAG4AIABvAHAAZQByAGEAdABvAHIAcwAgAG0AYQBrAGUAIAB0AGgAZQAgAGMAbwBtAG0AYQBuAGQAIABoAGEAcgBkAGUAcgAgAHQAbwAgAGMAbABhAHMAcwBpAGYAeQAgAHMAYQBmAGUAbAB5ACwADQAKACAAIAAgACAAIAAgACAAIAAjACAAcwBvACAAcgBlAGoAZQBjAHQAIAB0AGgAZQBtACAAcgBhAHQAaABlAHIAIAB0AGgAYQBuACAAdAByAHkAaQBuAGcAIAB0AG8AIABuAG8AcgBtAGEAbABpAHoAZQAgAHQAaABlAG0ALgANAAoAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJABlAGwAZQBtAGUAbgB0AC4AUgBlAGQAaQByAGUAYwB0AGkAbwBuAHMALgBDAG8AdQBuAHQAIAAtAGcAdAAgADAAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAJABuAHUAbABsAA0ACgAgACAAIAAgACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAIAAgACAAIABpAGYAIAAoAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAkAGUAbABlAG0AZQBuAHQALgBJAG4AdgBvAGMAYQB0AGkAbwBuAE8AcABlAHIAYQB0AG8AcgAgAC0AbgBlACAAJABuAHUAbABsACAALQBhAG4AZAANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJABlAGwAZQBtAGUAbgB0AC4ASQBuAHYAbwBjAGEAdABpAG8AbgBPAHAAZQByAGEAdABvAHIAIAAtAG4AZQAgAFsAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAFQAbwBrAGUAbgBLAGkAbgBkAF0AOgA6AFUAbgBrAG4AbwB3AG4ADQAKACAAIAAgACAAIAAgACAAIAApACAAewANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAcgBlAHQAdQByAG4AIAAkAG4AdQBsAGwADQAKACAAIAAgACAAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAAgACAAIAAgACQAcABhAHIAdABzACAAPQAgAEAAKAApAA0ACgAgACAAIAAgACAAIAAgACAAZgBvAHIAZQBhAGMAaAAgACgAJABjAG8AbQBtAGEAbgBkAEUAbABlAG0AZQBuAHQAIABpAG4AIAAkAGUAbABlAG0AZQBuAHQALgBDAG8AbQBtAGEAbgBkAEUAbABlAG0AZQBuAHQAcwApACAAewANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJABjAG8AbgB2AGUAcgB0AGUAZAAgAD0AIABDAG8AbgB2AGUAcgB0AC0AQwBvAG0AbQBhAG4AZABFAGwAZQBtAGUAbgB0ACAAJABjAG8AbQBtAGEAbgBkAEUAbABlAG0AZQBuAHQADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJABjAG8AbgB2AGUAcgB0AGUAZAAgAC0AZQBxACAAJABuAHUAbABsACkAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAJABuAHUAbABsAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAB9AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAkAHAAYQByAHQAcwAgACsAPQAgACQAYwBvAG4AdgBlAHIAdABlAGQADQAKACAAIAAgACAAIAAgACAAIAB9AA0ACgAgACAAIAAgACAAIAAgACAAcgBlAHQAdQByAG4AIAAkAHAAYQByAHQAcwANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIABpAGYAIAAoACQAZQBsAGUAbQBlAG4AdAAgAC0AaQBzACAAWwBTAHkAcwB0AGUAbQAuAE0AYQBuAGEAZwBlAG0AZQBuAHQALgBBAHUAdABvAG0AYQB0AGkAbwBuAC4ATABhAG4AZwB1AGEAZwBlAC4AQwBvAG0AbQBhAG4AZABFAHgAcAByAGUAcwBzAGkAbwBuAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIABpAGYAIAAoACQAZQBsAGUAbQBlAG4AdAAuAFIAZQBkAGkAcgBlAGMAdABpAG8AbgBzAC4AQwBvAHUAbgB0ACAALQBnAHQAIAAwACkAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAbgB1AGwAbAANAAoAIAAgACAAIAAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgACAAIAAgACAAIwAgAEEAbABsAG8AdwAgAGEAIABwAGEAcgBlAG4AdABoAGUAcwBpAHoAZQBkACAAcwBpAG4AZwBsAGUAIABwAGkAcABlAGwAaQBuAGUAIABlAGwAZQBtAGUAbgB0ACAAbABpAGsAZQAgACIAKABHAGUAdAAtAEMAbwBuAHQAZQBuAHQAIABmAG8AbwAuAHIAcwAgAC0AUgBhAHcAKQAiACAAcwBvAA0ACgAgACAAIAAgACAAIAAgACAAIwAgAHQAaABlACAAYwBhAGwAbABlAHIAIABzAHQAaQBsAGwAIABzAGUAZQBzACAAdABoAGUAIABpAG4AbgBlAHIAIABjAG8AbQBtAGEAbgBkACAAdwBvAHIAZABzAC4AIABNAG8AcgBlACAAYwBvAG0AcABsAGUAeAAgAGUAeABwAHIAZQBzAHMAaQBvAG4AcwAgAHMAdABhAHkAIAB1AG4AcwB1AHAAcABvAHIAdABlAGQALgANAAoAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJABlAGwAZQBtAGUAbgB0AC4ARQB4AHAAcgBlAHMAcwBpAG8AbgAgAC0AaQBzACAAWwBTAHkAcwB0AGUAbQAuAE0AYQBuAGEAZwBlAG0AZQBuAHQALgBBAHUAdABvAG0AYQB0AGkAbwBuAC4ATABhAG4AZwB1AGEAZwBlAC4AUABhAHIAZQBuAEUAeABwAHIAZQBzAHMAaQBvAG4AQQBzAHQAXQApACAAewANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJABpAG4AbgBlAHIAUABpAHAAZQBsAGkAbgBlACAAPQAgACQAZQBsAGUAbQBlAG4AdAAuAEUAeABwAHIAZQBzAHMAaQBvAG4ALgBQAGkAcABlAGwAaQBuAGUADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJABpAG4AbgBlAHIAUABpAHAAZQBsAGkAbgBlACAALQBhAG4AZAAgACQAaQBuAG4AZQByAFAAaQBwAGUAbABpAG4AZQAuAFAAaQBwAGUAbABpAG4AZQBFAGwAZQBtAGUAbgB0AHMALgBDAG8AdQBuAHQAIAAtAGUAcQAgADEAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAcgBlAHQAdQByAG4AIABDAG8AbgB2AGUAcgB0AC0AUABpAHAAZQBsAGkAbgBlAEUAbABlAG0AZQBuAHQAIAAkAGkAbgBuAGUAcgBQAGkAcABlAGwAaQBuAGUALgBQAGkAcABlAGwAaQBuAGUARQBsAGUAbQBlAG4AdABzAFsAMABdAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAB9AA0ACgAgACAAIAAgACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAbgB1AGwAbAANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAbgB1AGwAbAANAAoAfQANAAoADQAKAGYAdQBuAGMAdABpAG8AbgAgAEEAZABkAC0AQwBvAG0AbQBhAG4AZABzAEYAcgBvAG0AUABpAHAAZQBsAGkAbgBlAEEAcwB0ACAAewANAAoAIAAgACAAIABwAGEAcgBhAG0AKAAkAHAAaQBwAGUAbABpAG4AZQAsACAAJABjAG8AbQBtAGEAbgBkAHMAKQANAAoADQAKACAAIAAgACAAaQBmACAAKAAkAHAAaQBwAGUAbABpAG4AZQAuAFAAaQBwAGUAbABpAG4AZQBFAGwAZQBtAGUAbgB0AHMALgBDAG8AdQBuAHQAIAAtAGUAcQAgADAAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAZgBhAGwAcwBlAA0ACgAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgAGYAbwByAGUAYQBjAGgAIAAoACQAZQBsAGUAbQBlAG4AdAAgAGkAbgAgACQAcABpAHAAZQBsAGkAbgBlAC4AUABpAHAAZQBsAGkAbgBlAEUAbABlAG0AZQBuAHQAcwApACAAewANAAoAIAAgACAAIAAgACAAIAAgACQAdwBvAHIAZABzACAAPQAgAEMAbwBuAHYAZQByAHQALQBQAGkAcABlAGwAaQBuAGUARQBsAGUAbQBlAG4AdAAgACQAZQBsAGUAbQBlAG4AdAANAAoAIAAgACAAIAAgACAAIAAgAGkAZgAgACgAJAB3AG8AcgBkAHMAIAAtAGUAcQAgACQAbgB1AGwAbAAgAC0AbwByACAAJAB3AG8AcgBkAHMALgBDAG8AdQBuAHQAIAAtAGUAcQAgADAAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAJABmAGEAbABzAGUADQAKACAAIAAgACAAIAAgACAAIAB9AA0ACgAgACAAIAAgACAAIAAgACAAJABuAHUAbABsACAAPQAgACQAYwBvAG0AbQBhAG4AZABzAC4AQQBkAGQAKAAkAHcAbwByAGQAcwApAA0ACgAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgAHIAZQB0AHUAcgBuACAAJAB0AHIAdQBlAA0ACgB9AA0ACgANAAoAZgB1AG4AYwB0AGkAbwBuACAAQQBkAGQALQBDAG8AbQBtAGEAbgBkAHMARgByAG8AbQBQAGkAcABlAGwAaQBuAGUAQwBoAGEAaQBuACAAewANAAoAIAAgACAAIABwAGEAcgBhAG0AKAAkAGMAaABhAGkAbgAsACAAJABjAG8AbQBtAGEAbgBkAHMAKQANAAoADQAKACAAIAAgACAAaQBmACAAKAAtAG4AbwB0ACAAKABBAGQAZAAtAEMAbwBtAG0AYQBuAGQAcwBGAHIAbwBtAFAAaQBwAGUAbABpAG4AZQBCAGEAcwBlACAAJABjAGgAYQBpAG4ALgBMAGgAcwBQAGkAcABlAGwAaQBuAGUAQwBoAGEAaQBuACAAJABjAG8AbQBtAGEAbgBkAHMAKQApACAAewANAAoAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAJABmAGEAbABzAGUADQAKACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAaQBmACAAKAAtAG4AbwB0ACAAKABBAGQAZAAtAEMAbwBtAG0AYQBuAGQAcwBGAHIAbwBtAFAAaQBwAGUAbABpAG4AZQBBAHMAdAAgACQAYwBoAGEAaQBuAC4AUgBoAHMAUABpAHAAZQBsAGkAbgBlACAAJABjAG8AbQBtAGEAbgBkAHMAKQApACAAewANAAoAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAJABmAGEAbABzAGUADQAKACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAcgBlAHQAdQByAG4AIAAkAHQAcgB1AGUADQAKAH0ADQAKAA0ACgBmAHUAbgBjAHQAaQBvAG4AIABBAGQAZAAtAEMAbwBtAG0AYQBuAGQAcwBGAHIAbwBtAFAAaQBwAGUAbABpAG4AZQBCAGEAcwBlACAAewANAAoAIAAgACAAIABwAGEAcgBhAG0AKAAkAHAAaQBwAGUAbABpAG4AZQAsACAAJABjAG8AbQBtAGEAbgBkAHMAKQANAAoADQAKACAAIAAgACAAaQBmACAAKAAkAHAAaQBwAGUAbABpAG4AZQAgAC0AaQBzACAAWwBTAHkAcwB0AGUAbQAuAE0AYQBuAGEAZwBlAG0AZQBuAHQALgBBAHUAdABvAG0AYQB0AGkAbwBuAC4ATABhAG4AZwB1AGEAZwBlAC4AUABpAHAAZQBsAGkAbgBlAEEAcwB0AF0AKQAgAHsADQAKACAAIAAgACAAIAAgACAAIAByAGUAdAB1AHIAbgAgAEEAZABkAC0AQwBvAG0AbQBhAG4AZABzAEYAcgBvAG0AUABpAHAAZQBsAGkAbgBlAEEAcwB0ACAAJABwAGkAcABlAGwAaQBuAGUAIAAkAGMAbwBtAG0AYQBuAGQAcwANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAAjACAAVwBpAG4AZABvAHcAcwAgAFAAbwB3AGUAcgBTAGgAZQBsAGwAIAA1AC4AMQAgAGQAbwBlAHMAIABuAG8AdAAgAGQAZQBmAGkAbgBlACAAUABpAHAAZQBsAGkAbgBlAEMAaABhAGkAbgBBAHMAdAAsACAAcwBvACAAYQB2AG8AaQBkACAAYQAgAGQAaQByAGUAYwB0ACAAdAB5AHAAZQANAAoAIAAgACAAIAAjACAAcgBlAGYAZQByAGUAbgBjAGUAIABoAGUAcgBlACAAYQBuAGQAIABpAG4AcwB0AGUAYQBkACAAYwBoAGUAYwBrACAAdABoAGUAIAByAHUAbgB0AGkAbQBlACAAdAB5AHAAZQAgAG4AYQBtAGUALgANAAoAIAAgACAAIABpAGYAIAAoACQAcABpAHAAZQBsAGkAbgBlAC4ARwBlAHQAVAB5AHAAZQAoACkALgBGAHUAbABsAE4AYQBtAGUAIAAtAGUAcQAgACcAUwB5AHMAdABlAG0ALgBNAGEAbgBhAGcAZQBtAGUAbgB0AC4AQQB1AHQAbwBtAGEAdABpAG8AbgAuAEwAYQBuAGcAdQBhAGcAZQAuAFAAaQBwAGUAbABpAG4AZQBDAGgAYQBpAG4AQQBzAHQAJwApACAAewANAAoAIAAgACAAIAAgACAAIAAgAHIAZQB0AHUAcgBuACAAQQBkAGQALQBDAG8AbQBtAGEAbgBkAHMARgByAG8AbQBQAGkAcABlAGwAaQBuAGUAQwBoAGEAaQBuACAAJABwAGkAcABlAGwAaQBuAGUAIAAkAGMAbwBtAG0AYQBuAGQAcwANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAByAGUAdAB1AHIAbgAgACQAZgBhAGwAcwBlAA0ACgB9AA0ACgANAAoAIwAgAFQAaABpAHMAIABzAGMAcgBpAHAAdAAgAHMAdABhAHkAcwAgAGEAbABpAHYAZQAgAHMAbwAgAHQAaABlACAAUgB1AHMAdAAgAGMAYQBsAGwAZQByACAAYwBhAG4AIABhAG0AbwByAHQAaQB6AGUAIABQAG8AdwBlAHIAUwBoAGUAbABsACAAcwB0AGEAcgB0AHUAcAAgAGEAYwByAG8AcwBzAA0ACgAjACAAbQBhAG4AeQAgAHAAYQByAHMAZQAgAHIAZQBxAHUAZQBzAHQAcwAuACAARQBhAGMAaAAgAHIAZQBxAHUAZQBzAHQAIABhAG4AZAAgAHIAZQBzAHAAbwBuAHMAZQAgAGkAcwAgAG8AbgBlACAAYwBvAG0AcABhAGMAdAAgAEoAUwBPAE4AIABsAGkAbgBlAC4ADQAKAHcAaABpAGwAZQAgACgAKAAkAHIAZQBxAHUAZQBzAHQATABpAG4AZQAgAD0AIAAkAHMAdABkAGkAbgAuAFIAZQBhAGQATABpAG4AZQAoACkAKQAgAC0AbgBlACAAJABuAHUAbABsACkAIAB7AA0ACgAgACAAIAAgACQAcgBlAHEAdQBlAHMAdAAgAD0AIAAkAG4AdQBsAGwADQAKACAAIAAgACAAdAByAHkAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAJAByAGUAcQB1AGUAcwB0ACAAPQAgACQAcgBlAHEAdQBlAHMAdABMAGkAbgBlACAAfAAgAEMAbwBuAHYAZQByAHQARgByAG8AbQAtAEoAcwBvAG4ADQAKACAAIAAgACAAfQAgAGMAYQB0AGMAaAAgAHsADQAKACAAIAAgACAAIAAgACAAIABXAHIAaQB0AGUALQBSAGUAcwBwAG8AbgBzAGUAIABAAHsAIABpAGQAIAA9ACAAJABuAHUAbABsADsAIABzAHQAYQB0AHUAcwAgAD0AIAAnAHAAYQByAHMAZQBfAGYAYQBpAGwAZQBkACcAIAB9AA0ACgAgACAAIAAgACAAIAAgACAAYwBvAG4AdABpAG4AdQBlAA0ACgAgACAAIAAgAH0ADQAKAA0ACgAgACAAIAAgACMAIABXAGUAIABwAHIAbwBjAGUAcwBzACAAcgBlAHEAdQBlAHMAdABzACAAcwBlAHIAaQBhAGwAbAB5ACwAIABiAHUAdAAgAHMAdABpAGwAbAAgAGUAYwBoAG8AIAB0AGgAZQAgAGkAZAAgAGIAYQBjAGsAIABzAG8AIAB0AGgAZQAgAFIAdQBzAHQAIABzAGkAZABlACAAYwBhAG4ADQAKACAAIAAgACAAIwAgAGQAZQB0AGUAYwB0ACAAcAByAG8AdABvAGMAbwBsACAAZABlAHMAeQBuAGMAcwAgAGkAbgBzAHQAZQBhAGQAIABvAGYAIABzAGkAbABlAG4AdABsAHkAIAB0AHIAdQBzAHQAaQBuAGcAIABtAGkAeABlAGQAIABzAHQAZABvAHUAdAAuAA0ACgAgACAAIAAgACQAcgBlAHEAdQBlAHMAdABJAGQAIAA9ACAAJAByAGUAcQB1AGUAcwB0AC4AaQBkAA0ACgAgACAAIAAgACQAcABhAHkAbABvAGEAZAAgAD0AIAAkAHIAZQBxAHUAZQBzAHQALgBwAGEAeQBsAG8AYQBkAA0ACgAgACAAIAAgAGkAZgAgACgAWwBzAHQAcgBpAG4AZwBdADoAOgBJAHMATgB1AGwAbABPAHIARQBtAHAAdAB5ACgAJABwAGEAeQBsAG8AYQBkACkAKQAgAHsADQAKACAAIAAgACAAIAAgACAAIABXAHIAaQB0AGUALQBSAGUAcwBwAG8AbgBzAGUAIABAAHsAIABpAGQAIAA9ACAAJAByAGUAcQB1AGUAcwB0AEkAZAA7ACAAcwB0AGEAdAB1AHMAIAA9ACAAJwBwAGEAcgBzAGUAXwBmAGEAaQBsAGUAZAAnACAAfQANAAoAIAAgACAAIAAgACAAIAAgAGMAbwBuAHQAaQBuAHUAZQANAAoAIAAgACAAIAB9AA0ACgANAAoAIAAgACAAIAB0AHIAeQAgAHsADQAKACAAIAAgACAAIAAgACAAIAAkAHMAbwB1AHIAYwBlACAAPQANAAoAIAAgACAAIAAgACAAIAAgACAAIAAgACAAWwBTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBFAG4AYwBvAGQAaQBuAGcAXQA6ADoAVQBuAGkAYwBvAGQAZQAuAEcAZQB0AFMAdAByAGkAbgBnACgADQAKACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAWwBTAHkAcwB0AGUAbQAuAEMAbwBuAHYAZQByAHQAXQA6ADoARgByAG8AbQBCAGEAcwBlADYANABTAHQAcgBpAG4AZwAoACQAcABhAHkAbABvAGEAZAApAA0ACgAgACAAIAAgACAAIAAgACAAIAAgACAAIAApAA0ACgAgACAAIAAgAH0AIABjAGEAdABjAGgAIAB7AA0ACgAgACAAIAAgACAAIAAgACAAVwByAGkAdABlAC0AUgBlAHMAcABvAG4AcwBlACAAQAB7ACAAaQBkACAAPQAgACQAcgBlAHEAdQBlAHMAdABJAGQAOwAgAHMAdABhAHQAdQBzACAAPQAgACcAcABhAHIAcwBlAF8AZgBhAGkAbABlAGQAJwAgAH0ADQAKACAAIAAgACAAIAAgACAAIABjAG8AbgB0AGkAbgB1AGUADQAKACAAIAAgACAAfQANAAoADQAKACAAIAAgACAAVwByAGkAdABlAC0AUgBlAHMAcABvAG4AcwBlACAAKABJAG4AdgBvAGsAZQAtAFAAYQByAHMAZQBSAGUAcQB1AGUAcwB0ACAALQBSAGUAcQB1AGUAcwB0AEkAZAAgACQAcgBlAHEAdQBlAHMAdABJAGQAIAAtAFMAbwB1AHIAYwBlACAAJABzAG8AdQByAGMAZQApAA0ACgB9AA0ACgA="
    },
    {
      "pid": 5940,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 11644,
      "parentPid": 11660,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 991232,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 21708,
      "parentPid": 1940,
      "name": "ShellExperienceHost.exe",
      "executablePath": "C:\\Windows\\SystemApps\\ShellExperienceHost_cw5n1h2txyewy\\ShellExperienceHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 77275136,
      "commandLine": "C:\\WINDOWS\\SystemApps\\ShellExperienceHost_cw5n1h2txyewy\\ShellExperienceHost.exe -ServerName:App.AppXtk181tbxbce2qsex02s8tw7hfxa9xb3t.mca"
    },
    {
      "pid": 41628,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 36294656,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 11132:44220 -prefMapHandle 8392:306351 -jsInitHandle 10040:156120 -parentBuildID 20260429063222 -ipcHandle 10956 -initialChannelId {b1f16b4d-30c7-4971-80dd-7ac651a50931} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 137 tab"
    },
    {
      "pid": 22352,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 129974272,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 8332:44058 -prefMapHandle 8324:306351 -jsInitHandle 8320:156120 -parentBuildID 20260429063222 -ipcHandle 7660 -initialChannelId {81951d72-0b13-4f3a-8643-e504c73753b4} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 18 tab"
    },
    {
      "pid": 1804,
      "parentPid": 1636,
      "name": "lsass.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 13928,
      "parentPid": 13096,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4792320,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --type=utility --utility-sub-type=storage.mojom.StorageService --lang=en-US --service-sandbox-type=service --noerrdialogs --user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; Cortana 1.18.9.23723; 10.0.0.0.26200.8246) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.26200 IsWebView2/True (WebView2Version 147.0.3912.86) --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView --webview-exe-name=SearchHost.exe --webview-exe-version=2126.5604.40.0 --embedded-browser-webview=1 --always-read-main-dll --metrics-shmem-handle=2504,i,5637829117217386067,13132789579876504703,524288 --field-trial-handle=2028,i,2801751961654966079,10272391875469521625,262144 --enable-features=msEdgeFluentOverlayScrollbar --disable-features=msSmartScreenProtection --variations-seed-version --pseudonymization-salt-handle=2060,i,15445996603034493709,14482896526458014625,4 --trace-process-track-uuid=3190708990060038890 --mojo-platform-channel-handle=2524 /prefetch:13 /pfhostedapp:2a82e83d24f46d0980bfac30597d2b0d77c72d53"
    },
    {
      "pid": 10272,
      "parentPid": 1776,
      "name": "WUDFHost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4292,
      "parentPid": 8860,
      "name": "Todoist.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 41291776,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe --process-start-args --hidden"
    },
    {
      "pid": 2396,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 42844,
      "parentPid": 42632,
      "name": "vctip.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.44.35207\\bin\\Hostx64\\x64\\vctip.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 58585088,
      "commandLine": "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.44.35207\\bin\\HostX64\\x64\\VCTIP.EXE"
    },
    {
      "pid": 21224,
      "parentPid": 20380,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 630784,
      "commandLine": "cmd.exe /e:ON /v:OFF /d /c C:\\Program Files\\nodejs\\npx.cmd @playwright/mcp@latest"
    },
    {
      "pid": 7852,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1937408,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k LocalSystemNetworkRestricted -p -s webthreatdefusersvc"
    },
    {
      "pid": 6132,
      "parentPid": 3372,
      "name": "atieclxx.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 10524,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 163598336,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=gpu-process --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --gpu-preferences=SAAAAAAAAADgAAAEAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAACAAAAAAAAAAIAAAAAAAAAA== --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708988185955192 --mojo-platform-channel-handle=1812 /prefetch:2"
    },
    {
      "pid": 4,
      "parentPid": null,
      "name": "System",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6404,
      "parentPid": 1776,
      "name": "MsMpEng.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2508,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 16588,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 48046080,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 9084:44220 -prefMapHandle 8756:306351 -jsInitHandle 7040:156120 -parentBuildID 20260429063222 -ipcHandle 7792 -initialChannelId {8728eb6c-2c21-45cd-bcc4-51f3bc811e65} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 135 tab"
    },
    {
      "pid": 18968,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 31277056,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-US --service-sandbox-type=none --video-capture-use-gpu-memory-buffer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708995682289984 --mojo-platform-channel-handle=3888 /prefetch:14"
    },
    {
      "pid": 3640,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 33032,
      "parentPid": 31460,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4767744,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 11896,
      "parentPid": 1940,
      "name": "RuntimeBroker.exe",
      "executablePath": "C:\\Windows\\System32\\RuntimeBroker.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 36093952,
      "commandLine": "C:\\Windows\\System32\\RuntimeBroker.exe -Embedding"
    },
    {
      "pid": 2740,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6592,
      "parentPid": 1776,
      "name": "RtkAudUService64.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 42168,
      "parentPid": 1940,
      "name": "WmiPrvSE.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2552,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 21300,
      "parentPid": 1940,
      "name": "RuntimeBroker.exe",
      "executablePath": "C:\\Windows\\System32\\RuntimeBroker.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3903488,
      "commandLine": "C:\\Windows\\System32\\RuntimeBroker.exe -Embedding"
    },
    {
      "pid": 15260,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 481116160,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-US --service-sandbox-type=none --dns-result-order=ipv4first --experimental-network-inspection --inspect-port=0 --video-capture-use-gpu-memory-buffer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708991934122588 --mojo-platform-channel-handle=3988 /prefetch:14"
    },
    {
      "pid": 3160,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 12244,
      "parentPid": 1940,
      "name": "StartMenuExperienceHost.exe",
      "executablePath": "C:\\Windows\\SystemApps\\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\\StartMenuExperienceHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 85528576,
      "commandLine": "C:\\WINDOWS\\SystemApps\\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\\StartMenuExperienceHost.exe -ServerName:FullTrustApp.AppXykjsye98af63ez2annt9djke8trg8stn.mca"
    },
    {
      "pid": 15892,
      "parentPid": 10840,
      "name": "aw-watcher-window.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-watcher-window\\aw-watcher-window.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 15220736,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-watcher-window\\aw-watcher-window.exe"
    },
    {
      "pid": 20404,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 3364,
      "parentPid": 1776,
      "name": "amdfendrsr.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6388,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 10528,
      "parentPid": 1940,
      "name": "backgroundTaskHost.exe",
      "executablePath": "C:\\Windows\\System32\\backgroundTaskHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 19226624,
      "commandLine": "C:\\WINDOWS\\system32\\backgroundTaskHost.exe -ServerName:App.AppXe9cvj1thv1hmcw0cs98xm3r97tyzy2xs.mca"
    },
    {
      "pid": 4936,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6304,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 11316,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 30146560,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k ClipboardSvcGroup -p -s cbdhsvc"
    },
    {
      "pid": 3108,
      "parentPid": 5520,
      "name": "TabTip.exe",
      "executablePath": "C:\\Program Files\\Common Files\\microsoft shared\\ink\\TabTip.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 13619200,
      "commandLine": null
    },
    {
      "pid": 10780,
      "parentPid": 16048,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 32989184,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --embedded-browser-webview=1 --webview-exe-name=Raycast.exe --webview-exe-version=0.56.0.0+a9aa0058b96334cf5f875868d424bfb9be4067cc --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\Raycast.Raycast_qypenmj9wpt2a\\LocalState\\EBWebView --noerrdialogs --embedded-browser-webview-dpi-awareness=2 --allow-file-access-from-files --disable-background-timer-throttling --disable-features=msEnhancedTrackingPreventionEnabled --enable-features=msEdgeFluentOverlayScrollbar --single-process --mojo-named-platform-channel-pipe=16048.16336.2357110547520898584 /pfhostedapp:80afeefb1e0f886f80728c3da13896e4fe5f5d3d"
    },
    {
      "pid": 20324,
      "parentPid": 16500,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1286144,
      "commandLine": "C:\\WINDOWS\\system32\\cmd.exe /d /s /c playwright-mcp"
    },
    {
      "pid": 8132,
      "parentPid": 2620,
      "name": "PowerToys.CropAndLock.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\PowerToys\\PowerToys.CropAndLock.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 176128,
      "commandLine": null
    },
    {
      "pid": 9240,
      "parentPid": 11204,
      "name": "Simple PrayerTime Reminder.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 10006528,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe --type=gpu-process --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\simple-prayertime-reminder --gpu-preferences=UAAAAAAAAADgAAAYAAAAAAAAAAAAAAAAAABgAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAAAAAASAAAAAAAAAAYAAAAAgAAABAAAAAAAAAAGAAAAAAAAAAQAAAAAAAAAAAAAAAOAAAAEAAAAAAAAAABAAAADgAAAAgAAAAAAAAACAAAAAAAAAA= --mojo-platform-channel-handle=1668 --field-trial-handle=1596,i,18401815728300173226,18372673367316372715,131072 --disable-features=SpareRendererForSitePerProcess,WinRetrieveSuggestionsOnlyOnDemand /prefetch:2"
    },
    {
      "pid": 15316,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 326729728,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --app-user-model-id=Microsoft.VisualStudioCode --app-path=C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app --enable-sandbox --enable-blink-features=HighlightAPI --max-active-webgl-contexts=32 --disable-blink-features=FontMatchingCTMigration,StandardizedBrowserZoom, --video-capture-use-gpu-memory-buffer --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=11 --time-ticks-at-unix-epoch=-1777708760203686 --launch-time-ticks=154490486 --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708996619331833 --mojo-platform-channel-handle=4168 --vscode-window-config=vscode:afb8f38b-3fbe-4718-9ec6-9fb08e71a4e6 /prefetch:1"
    },
    {
      "pid": 30484,
      "parentPid": 15260,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 400273408,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe c:\\Users\\Mohaned\\.vscode\\extensions\\ms-python.vscode-pylance-2026.2.1\\dist\\server.bundle.js --cancellationReceive=file:4b2f7635fbe3dba943d59faa6fa72cb10a1b3ad0a4 --node-ipc --clientProcessId=15260"
    },
    {
      "pid": 6344,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 41668,
      "parentPid": 40624,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 5173248,
      "commandLine": "C:\\WINDOWS\\system32\\cmd.exe /d /s /c powershell -ExecutionPolicy Bypass -File ./scripts/run-background-tests.ps1"
    },
    {
      "pid": 9784,
      "parentPid": 13868,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 372736,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 4480,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 39360,
      "parentPid": 38208,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 49516544,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US --service-sandbox-type=none --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App --enable-sandbox --field-trial-handle=1776,i,8440885303138786751,17765263234884207726,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708989122997041 --mojo-platform-channel-handle=2008 /prefetch:11"
    },
    {
      "pid": 16852,
      "parentPid": 16828,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 495616,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 6140,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 18860,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 75702272,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-US --service-sandbox-type=none --video-capture-use-gpu-memory-buffer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708993808206286 --mojo-platform-channel-handle=4152 /prefetch:14"
    },
    {
      "pid": 3068,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 3436,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 16500,
      "parentPid": 30056,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8261632,
      "commandLine": "C:\\Program Files\\nodejs\\\\node.exe C:\\Program Files\\nodejs\\\\node_modules\\npm\\bin\\npx-cli.js @playwright/mcp@latest"
    },
    {
      "pid": 22232,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 10840,
      "parentPid": 8860,
      "name": "aw-qt.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-qt.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6488064,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\ActivityWatch\\aw-qt.exe"
    },
    {
      "pid": 8412,
      "parentPid": 2508,
      "name": "Lenovo Legion Toolkit.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\LenovoLegionToolkit\\Lenovo Legion Toolkit.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 9277440,
      "commandLine": null
    },
    {
      "pid": 6696,
      "parentPid": 15260,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8187904,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe c:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\extensions\\markdown-language-features\\dist\\serverWorkerMain --node-ipc --clientProcessId=15260"
    },
    {
      "pid": 5400,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5976,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6037504,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -parentBuildID 20260429063222 -prefsHandle 3816:44332 -prefMapHandle 3784:306351 -ipcHandle 3776 -initialChannelId {f4debddd-b7ff-4b3a-b5fb-085a4986030c} -parentPid 11000 -appDir C:\\Program Files\\Zen Browser\\browser - 4 rdd"
    },
    {
      "pid": 22276,
      "parentPid": 15260,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 7208960,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe c:\\Users\\Mohaned\\.vscode\\extensions\\formulahendry.auto-rename-tag-0.1.10\\packages\\server\\dist\\serverMain.js --node-ipc --clientProcessId=15260"
    },
    {
      "pid": 42808,
      "parentPid": 1940,
      "name": "smartscreen.exe",
      "executablePath": "C:\\Windows\\System32\\smartscreen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 12689408,
      "commandLine": "C:\\Windows\\System32\\smartscreen.exe -Embedding"
    },
    {
      "pid": 3264,
      "parentPid": 1776,
      "name": "NVDisplay.Container.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4792,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 37472,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 11000,
      "parentPid": 12956,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 502284288,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe"
    },
    {
      "pid": 8728,
      "parentPid": 6320,
      "name": "nvcontainer.exe",
      "executablePath": "C:\\Program Files\\NVIDIA Corporation\\NvContainer\\nvcontainer.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 19226624,
      "commandLine": "C:\\Program Files\\NVIDIA Corporation\\NvContainer\\nvcontainer.exe -f C:\\ProgramData\\NVIDIA Corporation\\NVIDIA App\\NvContainer\\NvContainerUser%d.log -d C:\\Program Files\\NVIDIA Corporation\\NvContainer\\plugins\\User -r -l 3 -p 30000 -c"
    },
    {
      "pid": 1452,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2096,
      "parentPid": 2508,
      "name": "helperservice.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 3524,
      "parentPid": 6528,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3837952,
      "commandLine": "C:\\WINDOWS\\System32\\cmd.exe"
    },
    {
      "pid": 29304,
      "parentPid": 21224,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 8015872,
      "commandLine": "C:\\Program Files\\nodejs\\\\node.exe C:\\Program Files\\nodejs\\\\node_modules\\npm\\bin\\npx-cli.js @playwright/mcp@latest"
    },
    {
      "pid": 27572,
      "parentPid": 4060,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1130496,
      "commandLine": "C:\\WINDOWS\\system32\\cmd.exe /d /s /c playwright-mcp"
    },
    {
      "pid": 7300,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 14780,
      "parentPid": 15892,
      "name": "conhost.exe",
      "executablePath": "C:\\Windows\\System32\\conhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 991232,
      "commandLine": "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"
    },
    {
      "pid": 6336,
      "parentPid": 1776,
      "name": "wslservice.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 38460,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5460,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 1776,
      "parentPid": 1636,
      "name": "services.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5596,
      "parentPid": 5520,
      "name": "ctfmon.exe",
      "executablePath": "C:\\Windows\\System32\\ctfmon.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 15134720,
      "commandLine": null
    },
    {
      "pid": 4384,
      "parentPid": 1776,
      "name": "spoolsv.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 3596,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 1448,
      "parentPid": 1056,
      "name": "csrss.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 37720,
      "parentPid": 14416,
      "name": "SearchProtocolHost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 14184,
      "parentPid": 13096,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 76263424,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --type=renderer --noerrdialogs --user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; Cortana 1.18.9.23723; 10.0.0.0.26200.8246) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.26200 IsWebView2/True (WebView2Version 147.0.3912.86) --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView --webview-exe-name=SearchHost.exe --webview-exe-version=2126.5604.40.0 --embedded-browser-webview=1 --video-capture-use-gpu-memory-buffer --lang=en-US --js-flags=--expose-gc --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=5 --time-ticks-at-unix-epoch=-1777708760203687 --launch-time-ticks=43828226 --always-read-main-dll --metrics-shmem-handle=3948,i,14329523904912311771,3771664141545698032,2097152 --field-trial-handle=2028,i,2801751961654966079,10272391875469521625,262144 --enable-features=msEdgeFluentOverlayScrollbar --disable-features=msSmartScreenProtection --variations-seed-version --pseudonymization-salt-handle=2060,i,15445996603034493709,14482896526458014625,4 --trace-process-track-uuid=3190708990997080739 --mojo-platform-channel-handle=3972 /pfhostedapp:2a82e83d24f46d0980bfac30597d2b0d77c72d53 /prefetch:1"
    },
    {
      "pid": 7164,
      "parentPid": 11000,
      "name": "wenativehost.exe",
      "executablePath": "C:\\Program Files\\Softdeluxe\\Free Download Manager\\wenativehost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4222976,
      "commandLine": "C:\\Program Files\\Softdeluxe\\Free Download Manager\\wenativehost.exe C:\\Users\\Mohaned\\AppData\\Local\\Softdeluxe\\Free Download Manager\\Mozilla\\org.freedownloadmanager.fdm5.cnh.json fdm_ffext2@freedownloadmanager.org"
    },
    {
      "pid": 31460,
      "parentPid": 15260,
      "name": "pet.exe",
      "executablePath": "C:\\Users\\Mohaned\\.vscode\\extensions\\ms-python.vscode-python-envs-1.28.0-win32-x64\\python-env-tools\\bin\\pet.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 7888896,
      "commandLine": "c:\\Users\\Mohaned\\.vscode\\extensions\\ms-python.vscode-python-envs-1.28.0-win32-x64\\python-env-tools\\bin\\pet.exe server"
    },
    {
      "pid": 31432,
      "parentPid": 1940,
      "name": "RuntimeBroker.exe",
      "executablePath": "C:\\Windows\\System32\\RuntimeBroker.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 29458432,
      "commandLine": "C:\\Windows\\System32\\RuntimeBroker.exe -Embedding"
    },
    {
      "pid": 1824,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 13096,
      "parentPid": 12272,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 45338624,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --embedded-browser-webview=1 --webview-exe-name=SearchHost.exe --webview-exe-version=2126.5604.40.0 --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView --noerrdialogs --disable-features=msSmartScreenProtection --edge-webview-enable-mojo-ipcz --enable-features=msEdgeFluentOverlayScrollbar --user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; Cortana 1.18.9.23723; 10.0.0.0.26200.8246) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.26200 IsWebView2/True (WebView2Version 147.0.3912.86) --lang=en-US --mojo-named-platform-channel-pipe=12272.13296.346440446715826176 /pfhostedapp:2a82e83d24f46d0980bfac30597d2b0d77c72d53"
    },
    {
      "pid": 11176,
      "parentPid": 1940,
      "name": "ApplicationFrameHost.exe",
      "executablePath": "C:\\Windows\\System32\\ApplicationFrameHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 13107200,
      "commandLine": "C:\\WINDOWS\\system32\\ApplicationFrameHost.exe -Embedding"
    },
    {
      "pid": 6280,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 11108,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 301572096,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --app-user-model-id=Microsoft.VisualStudioCode --app-path=C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app --enable-sandbox --enable-blink-features=HighlightAPI --max-active-webgl-contexts=32 --disable-blink-features=FontMatchingCTMigration,StandardizedBrowserZoom, --video-capture-use-gpu-memory-buffer --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=4 --time-ticks-at-unix-epoch=-1777708760203686 --launch-time-ticks=150291182 --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708990060038890 --mojo-platform-channel-handle=3200 --vscode-window-config=vscode:afb8f38b-3fbe-4718-9ec6-9fb08e71a4e6 /prefetch:1"
    },
    {
      "pid": 3372,
      "parentPid": 1776,
      "name": "atiesrxx.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 22272,
      "parentPid": 20380,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1441792,
      "commandLine": "cmd.exe /e:ON /v:OFF /d /c C:\\Program Files\\nodejs\\npx.cmd @playwright/mcp@latest"
    },
    {
      "pid": 11676,
      "parentPid": 1940,
      "name": "CrossDeviceService.exe",
      "executablePath": "C:\\Program Files\\WindowsApps\\MicrosoftWindows.CrossDevice_1.26022.46.0_x64__cw5n1h2txyewy\\CrossDeviceService.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 179998720,
      "commandLine": "C:\\Program Files\\WindowsApps\\MicrosoftWindows.CrossDevice_1.26022.46.0_x64__cw5n1h2txyewy\\CrossDeviceService.exe -RegisterProcessAsComServer -Embedding"
    },
    {
      "pid": 16828,
      "parentPid": 16048,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\WindowsApps\\Raycast.Raycast_0.56.0.0_x64__qypenmj9wpt2a\\Raycast\\backend\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 10608640,
      "commandLine": "C:\\Program Files\\WindowsApps\\Raycast.Raycast_0.56.0.0_x64__qypenmj9wpt2a\\Raycast\\backend\\node.exe C:\\Program Files\\WindowsApps\\Raycast.Raycast_0.56.0.0_x64__qypenmj9wpt2a\\Raycast\\backend\\index.mjs"
    },
    {
      "pid": 13644,
      "parentPid": 13096,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 37601280,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --type=gpu-process --noerrdialogs --user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; Cortana 1.18.9.23723; 10.0.0.0.26200.8246) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.26200 IsWebView2/True (WebView2Version 147.0.3912.86) --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView --webview-exe-name=SearchHost.exe --webview-exe-version=2126.5604.40.0 --embedded-browser-webview=1 --gpu-preferences=SAAAAAAAAADgAAAEAAAAAAAAAAAAAGAAAQAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAACAAAAAAAAAAIAAAAAAAAAA== --always-read-main-dll --metrics-shmem-handle=1920,i,4512183965252534211,16664979495501962912,262144 --field-trial-handle=2028,i,2801751961654966079,10272391875469521625,262144 --enable-features=msEdgeFluentOverlayScrollbar --disable-features=msSmartScreenProtection --variations-seed-version --pseudonymization-salt-handle=2060,i,15445996603034493709,14482896526458014625,4 --trace-process-track-uuid=3190708988185955192 --mojo-platform-channel-handle=2020 /prefetch:2 /pfhostedapp:2a82e83d24f46d0980bfac30597d2b0d77c72d53"
    },
    {
      "pid": 38684,
      "parentPid": 33024,
      "name": "cargo.exe",
      "executablePath": "C:\\Users\\Mohaned\\.rustup\\toolchains\\stable-x86_64-pc-windows-msvc\\bin\\cargo.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 28598272,
      "commandLine": "C:\\Users\\Mohaned\\.rustup\\toolchains\\stable-x86_64-pc-windows-msvc\\bin\\cargo.exe run --quiet --bin posture_snapshot -- --out ../logs/info"
    },
    {
      "pid": 4604,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 18168,
      "parentPid": 18116,
      "name": "NhNotifSys.exe",
      "executablePath": "C:\\Windows\\System32\\NhNotifSys.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 5967872,
      "commandLine": "C:\\WINDOWS\\system32\\NhNotifSys.exe /app nahimic /wait-install"
    },
    {
      "pid": 20180,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2016,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3653632,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -parentBuildID 20260429063222 -sandboxingKind 1 -prefsHandle 4288:54965 -prefMapHandle 6736:306351 -ipcHandle 7248 -initialChannelId {ec701a62-b89e-47dd-8b96-c2ffc143cbb4} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 13 utility"
    },
    {
      "pid": 2988,
      "parentPid": 4292,
      "name": "Todoist.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 5767168,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\todoist\\Todoist.exe --type=utility --utility-sub-type=audio.mojom.AudioService --lang=en-US --service-sandbox-type=audio --video-capture-use-gpu-memory-buffer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Todoist --secure-schemes=sentry-ipc --bypasscsp-schemes=sentry-ipc --cors-schemes=sentry-ipc --fetch-schemes=sentry-ipc --field-trial-handle=1736,i,8071470809446748431,18208560511378751850,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=DropInputEventsWhilePaintHolding,LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --pseudonymization-salt-handle=1744,i,2687594684717004520,18117209818277242904,4 --trace-process-track-uuid=3190708990997080739 --mojo-platform-channel-handle=4216 /prefetch:12"
    },
    {
      "pid": 14416,
      "parentPid": 1776,
      "name": "SearchIndexer.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 1704,
      "parentPid": 1628,
      "name": "winlogon.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 1644,
      "parentPid": 1628,
      "name": "csrss.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 16444,
      "parentPid": 20380,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1581056,
      "commandLine": "cmd.exe /e:ON /v:OFF /d /c C:\\Program Files\\nodejs\\npx.cmd @playwright/mcp@latest"
    },
    {
      "pid": 2560,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 1972,
      "parentPid": 1636,
      "name": "fontdrvhost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4116,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2388,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 13868,
      "parentPid": 15260,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 286720,
      "commandLine": "C:\\WINDOWS\\system32\\cmd.exe /d /s /c c:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\jdk\\bin\\java.exe -Djava.net.useSystemProxies=true -Duser.language=en -p c:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\launch;c:\\Users\\Mohaned\\.vscode\\extensions\\oracle.sql-developer-26.1.1-win32-x64\\dbtools\\sqlcl\\launch --add-modules ALL-DEFAULT --add-opens java.prefs/java.util.prefs=oracle.dbtools.win32 --add-opens jdk.security.auth/com.sun.security.auth.module=oracle.dbtools.win32 -m com.oracle.dbtools.launch server --key-id dbtools-client-15260 --clientProcessId 15260 MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAspuy8VB4+SP7CTsWamQNO9HCbYGSgOXI9v5ApGqTH3hGEYphEz2gcd+nfiNBhDyRz/VJzbQlNDPhvDTr1Z5fzduV9oSZBH0XmqWQnPW+W908CfWQy9RM/Hk11eeabnuIoOE+8Qqpdtw+4HPOekoO/vDO0UbM7yKS62U+yZ+01TTsKXUo2bjgmeVVZhNWsfG8g/EjoQBSnZQe+XFaAxJ9laHthqIc3Y7F0+hR2NcgDkKhOYFEUxsJmGAcsuoUgIUeFAY96+yQ2qa4OI6V5f/spwU+21IePYMUtA6wxyK/WceAQ6VLrn3Mnp1xK9WWYRqkb+4snQ2LjBjNZDGVmRYxyQIDAQAB"
    },
    {
      "pid": 12272,
      "parentPid": 1940,
      "name": "SearchHost.exe",
      "executablePath": "C:\\Windows\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\SearchHost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 82382848,
      "commandLine": "C:\\WINDOWS\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\SearchHost.exe -ServerName:CortanaUI.AppXstmwaab17q5s3y22tp6apqz7a45vwv65.mca"
    },
    {
      "pid": 14060,
      "parentPid": 1776,
      "name": "NisSrv.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5408,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2108,
      "parentPid": 1704,
      "name": "dwm.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 20864,
      "parentPid": 8860,
      "name": "Telegram.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Roaming\\Telegram Desktop\\Telegram.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 415334400,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Roaming\\Telegram Desktop\\Telegram.exe -autostart"
    },
    {
      "pid": 37556,
      "parentPid": 1940,
      "name": "RuntimeBroker.exe",
      "executablePath": "C:\\Windows\\System32\\RuntimeBroker.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 10272768,
      "commandLine": "C:\\Windows\\System32\\RuntimeBroker.exe -Embedding"
    },
    {
      "pid": 236,
      "parentPid": 4,
      "name": "Secure System",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 27284,
      "parentPid": 3524,
      "name": "python.exe",
      "executablePath": "C:\\Users\\Mohaned\\miniconda3\\python.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 50778112,
      "commandLine": "python manage.py runserver"
    },
    {
      "pid": 19236,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 116334592,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -isForBrowser -prefsHandle 5136:44389 -prefMapHandle 4920:306351 -jsInitHandle 3324:156120 -parentBuildID 20260429063222 -ipcHandle 5132 -initialChannelId {a9038bfe-8ca7-41ce-828f-e457d2a8cefb} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 7 tab"
    },
    {
      "pid": 10316,
      "parentPid": 11204,
      "name": "Simple PrayerTime Reminder.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 39436288,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\simple-prayertime-reminder --app-path=C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\resources\\app.asar --no-sandbox --no-zygote --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=4 --launch-time-ticks=74605738 --mojo-platform-channel-handle=2344 --field-trial-handle=1596,i,18401815728300173226,18372673367316372715,131072 --disable-features=SpareRendererForSitePerProcess,WinRetrieveSuggestionsOnlyOnDemand /prefetch:1"
    },
    {
      "pid": 10564,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 31068160,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k UdkSvcGroup -s UdkUserSvc"
    },
    {
      "pid": 36068,
      "parentPid": 6528,
      "name": "OpenConsole.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\node_modules\\node-pty\\build\\Release\\conpty\\OpenConsole.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 7524352,
      "commandLine": "c:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\node_modules\\node-pty\\build\\Release\\conpty\\OpenConsole.exe --headless --width 80 --height 30 --signal 0x838 --server 0x894"
    },
    {
      "pid": 23784,
      "parentPid": 15260,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 13099008,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe c:\\Users\\Mohaned\\.vscode\\extensions\\bradlc.vscode-tailwindcss-0.14.29\\dist\\tailwindServer.js --node-ipc --clientProcessId=15260"
    },
    {
      "pid": 6312,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6864,
      "parentPid": 6352,
      "name": "spacedeskServiceTray.exe",
      "executablePath": "C:\\Program Files\\datronicsoft\\spacedesk\\spacedeskServiceTray.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1503232,
      "commandLine": " This is spacedesk Service calling."
    },
    {
      "pid": 5748,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5016,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 11032,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 12400,
      "parentPid": 13096,
      "name": "msedgewebview2.exe",
      "executablePath": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1757184,
      "commandLine": "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --type=crashpad-handler --user-data-dir=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView /prefetch:4 /pfhostedapp:2a82e83d24f46d0980bfac30597d2b0d77c72d53 --monitor-self-annotation=ptype=crashpad-handler --database=C:\\Users\\Mohaned\\AppData\\Local\\Packages\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\LocalState\\EBWebView\\Crashpad --annotation=IsOfficialBuild=1 --annotation=channel= --annotation=chromium-version=147.0.7727.118 --annotation=exe=C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\147.0.3912.86\\msedgewebview2.exe --annotation=plat=Win64 --annotation=prod=Edge WebView2 --annotation=ver=147.0.3912.86 --initial-client-data=0x170,0x174,0x178,0x130,0x180,0x7ff8cb550d58,0x7ff8cb550d64,0x7ff8cb550d70"
    },
    {
      "pid": 1636,
      "parentPid": 1056,
      "name": "wininit.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 16684,
      "parentPid": 11000,
      "name": "zen.exe",
      "executablePath": "C:\\Program Files\\Zen Browser\\zen.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4300800,
      "commandLine": "C:\\Program Files\\Zen Browser\\zen.exe -contentproc -parentBuildID 20260429063222 -prefsHandle 2804:44229 -prefMapHandle 2880:306351 -ipcHandle 2928 -initialChannelId {a054f5eb-fc64-470b-ae02-570b25c32225} -parentPid 11000 -win32kLockedDown -appDir C:\\Program Files\\Zen Browser\\browser - 2 socket"
    },
    {
      "pid": 2200,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6528,
      "parentPid": 8972,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 43024384,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-US --service-sandbox-type=none --video-capture-use-gpu-memory-buffer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\Code --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --field-trial-handle=1816,i,12751456176565532221,16910014866036238825,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EnableTransparentHwndEnlargement,EstablishGpuChannelAsync --disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708997556373682 --mojo-platform-channel-handle=4016 /prefetch:14"
    },
    {
      "pid": 8972,
      "parentPid": 8860,
      "name": "Code.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 98209792,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe"
    },
    {
      "pid": 16048,
      "parentPid": 8932,
      "name": "Raycast.exe",
      "executablePath": "C:\\Program Files\\WindowsApps\\Raycast.Raycast_0.56.0.0_x64__qypenmj9wpt2a\\Raycast\\Raycast.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 11079680,
      "commandLine": "C:\\Program Files\\WindowsApps\\Raycast.Raycast_0.56.0.0_x64__qypenmj9wpt2a\\Raycast\\Raycast.exe --silent-restart --hardened"
    },
    {
      "pid": 8668,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 30480,
      "parentPid": 25836,
      "name": "cmd.exe",
      "executablePath": "C:\\Windows\\System32\\cmd.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 1077248,
      "commandLine": "C:\\WINDOWS\\system32\\cmd.exe /d /s /c playwright-mcp"
    },
    {
      "pid": 25004,
      "parentPid": 1940,
      "name": "UserOOBEBroker.exe",
      "executablePath": "C:\\Windows\\System32\\oobe\\UserOOBEBroker.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6324224,
      "commandLine": "C:\\Windows\\System32\\oobe\\UserOOBEBroker.exe -Embedding"
    },
    {
      "pid": 37908,
      "parentPid": 38208,
      "name": "youtube-music-desktop-app.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 238985216,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\youtube-music-desktop-app.exe --type=renderer --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\YouTube Music Desktop App --enable-sandbox --app-user-model-id=com.squirrel.youtube_music_desktop_app.youtube-music-desktop-app --app-path=C:\\Users\\Mohaned\\AppData\\Local\\youtube_music_desktop_app\\app-2.0.11\\resources\\app.asar --enable-sandbox --video-capture-use-gpu-memory-buffer --lang=en-US --device-scale-factor=1.25 --num-raster-threads=4 --enable-main-frame-before-activation --renderer-client-id=6 --time-ticks-at-unix-epoch=-1777708758743274 --launch-time-ticks=4352095003 --field-trial-handle=1776,i,8440885303138786751,17765263234884207726,262144 --enable-features=EnableTransparentHwndEnlargement,PdfUseShowSaveFilePicker --disable-features=LocalNetworkAccessChecks,NetworkServiceSandbox,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TraceSiteInstanceGetProcessCreation --variations-seed-version --trace-process-track-uuid=3190708991934122588 --mojo-platform-channel-handle=3112 /prefetch:1"
    },
    {
      "pid": 2268,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 4536,
      "parentPid": 11204,
      "name": "Simple PrayerTime Reminder.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 5816320,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe --type=utility --utility-sub-type=audio.mojom.AudioService --lang=en-US --service-sandbox-type=audio --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\simple-prayertime-reminder --mojo-platform-channel-handle=2672 --field-trial-handle=1596,i,18401815728300173226,18372673367316372715,131072 --disable-features=SpareRendererForSitePerProcess,WinRetrieveSuggestionsOnlyOnDemand /prefetch:8"
    },
    {
      "pid": 6200,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": "C:\\Windows\\System32\\svchost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 21880832,
      "commandLine": "C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc"
    },
    {
      "pid": 18400,
      "parentPid": 11204,
      "name": "Simple PrayerTime Reminder.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 12816384,
      "commandLine": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\simple-prayertime-reminder\\Simple PrayerTime Reminder.exe --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US --service-sandbox-type=none --user-data-dir=C:\\Users\\Mohaned\\AppData\\Roaming\\simple-prayertime-reminder --mojo-platform-channel-handle=2052 --field-trial-handle=1596,i,18401815728300173226,18372673367316372715,131072 --disable-features=SpareRendererForSitePerProcess,WinRetrieveSuggestionsOnlyOnDemand /prefetch:8"
    },
    {
      "pid": 6320,
      "parentPid": 1776,
      "name": "nvcontainer.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 38616,
      "parentPid": 20380,
      "name": "powershell.exe",
      "executablePath": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 65232896,
      "commandLine": "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -Command [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;\npnpm run test:bg"
    },
    {
      "pid": 7908,
      "parentPid": 7804,
      "name": "NgcIso.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 2972,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 10516,
      "parentPid": 1776,
      "name": "WUDFHost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 6732,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 19872,
      "parentPid": 1776,
      "name": "SecurityHealthService.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 9388,
      "parentPid": 8068,
      "name": "CrossDeviceResume.exe",
      "executablePath": "C:\\Windows\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\CrossDeviceResume.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 5124096,
      "commandLine": "C:\\WINDOWS\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\CrossDeviceResume.exe /tileid MicrosoftWindows.Client.CBS_cw5n1h2txyewy!CrossDeviceResumeApp"
    },
    {
      "pid": 13788,
      "parentPid": 1940,
      "name": "dllhost.exe",
      "executablePath": "C:\\Windows\\System32\\dllhost.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 4841472,
      "commandLine": "C:\\WINDOWS\\system32\\DllHost.exe /Processid:{B21858C6-9711-4257-99C8-5C0084BEBCE1}"
    },
    {
      "pid": 10996,
      "parentPid": 1940,
      "name": "AppActions.exe",
      "executablePath": "C:\\Windows\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\AppActions.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 9891840,
      "commandLine": "C:\\WINDOWS\\SystemApps\\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\\AppActions.exe -Embedding"
    },
    {
      "pid": 33024,
      "parentPid": 37588,
      "name": "cargo.exe",
      "executablePath": "C:\\Users\\Mohaned\\.cargo\\bin\\cargo.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 12443648,
      "commandLine": "C:\\Users\\Mohaned\\.cargo\\bin\\cargo.exe run --quiet --bin posture_snapshot -- --out ../logs/info"
    },
    {
      "pid": 2832,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 5420,
      "parentPid": 4,
      "name": "Memory Compression",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 3776,
      "parentPid": 3264,
      "name": "NVDisplay.Container.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 19976,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 15192,
      "parentPid": 1940,
      "name": "RuntimeBroker.exe",
      "executablePath": "C:\\Windows\\System32\\RuntimeBroker.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 2252800,
      "commandLine": "C:\\Windows\\System32\\RuntimeBroker.exe -Embedding"
    },
    {
      "pid": 19928,
      "parentPid": 6528,
      "name": "OpenConsole.exe",
      "executablePath": "C:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\node_modules\\node-pty\\build\\Release\\conpty\\OpenConsole.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 3768320,
      "commandLine": "c:\\Users\\Mohaned\\AppData\\Local\\Programs\\Microsoft VS Code\\034f571df5\\resources\\app\\node_modules\\node-pty\\build\\Release\\conpty\\OpenConsole.exe --headless --width 104 --height 9 --signal 0x7b8 --server 0x7b0"
    },
    {
      "pid": 4248,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    },
    {
      "pid": 12132,
      "parentPid": 20324,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 6029312,
      "commandLine": "node C:\\Users\\Mohaned\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\.bin\\\\..\\@playwright\\mcp\\cli.js"
    },
    {
      "pid": 20156,
      "parentPid": 30480,
      "name": "node.exe",
      "executablePath": "C:\\Program Files\\nodejs\\node.exe",
      "cpuUsagePercent": 0.0,
      "memoryBytes": 12845056,
      "commandLine": "node C:\\Users\\Mohaned\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\.bin\\\\..\\@playwright\\mcp\\cli.js"
    },
    {
      "pid": 7072,
      "parentPid": 1776,
      "name": "svchost.exe",
      "executablePath": null,
      "cpuUsagePercent": 0.0,
      "memoryBytes": 0,
      "commandLine": null
    }
  ],
  "network": {
    "interfaces": [
      {
        "name": "WiFi-Npcap Packet Driver (NPCAP)-0000",
        "receivedBytes": 6084798,
        "transmittedBytes": 2199453
      },
      {
        "name": "WiFi-VirtualBox NDIS Light-Weight Filter-0000",
        "receivedBytes": 6084798,
        "transmittedBytes": 2199453
      },
      {
        "name": "WiFi",
        "receivedBytes": 6085042,
        "transmittedBytes": 2199453
      },
      {
        "name": "WiFi-Kaspersky Lab NDIS 6 Filter-0000",
        "receivedBytes": 6084798,
        "transmittedBytes": 2199453
      },
      {
        "name": "Bluetooth Network Connection",
        "receivedBytes": 0,
        "transmittedBytes": 0
      },
      {
        "name": "WiFi-QoS Packet Scheduler-0000",
        "receivedBytes": 6084798,
        "transmittedBytes": 2199453
      }
    ],
    "listeningPorts": [
      {
        "protocol": "UDP",
        "port": 123,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 135,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 137,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 138,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 139,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 445,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 500,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 546,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 1900,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 4500,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 5040,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 5050,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 5353,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 5355,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 5600,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 7265,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 7680,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 8000,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 10010,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 28252,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 28252,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49664,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49665,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49666,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 49666,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49667,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 49667,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49668,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49670,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49747,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49813,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 49949,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 50547,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 50622,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 50623,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 52417,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 52422,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 52426,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 52813,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 54149,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 59096,
        "process": null
      },
      {
        "protocol": "TCP",
        "port": 59708,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 60089,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 60090,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 60091,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 60092,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 60230,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 62242,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 62243,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 64088,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 64862,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 64863,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 64864,
        "process": null
      },
      {
        "protocol": "UDP",
        "port": 64865,
        "process": null
      }
    ],
    "activeConnections": [],
    "defaultGateway": null,
    "dnsServers": [],
    "notes": [
      "Active connections, DNS servers, and default gateway are placeholders unless implemented with platform APIs."
    ]
  },
  "software": {
    "software": [
      {
        "name": "draw.io 27.0.9                                                 27.0.9             JGraph",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Upscayl 2.15.0                                                 2.15.0             Nayam Amarshe",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "7-Zip 24.09 (x64)                                              24.09              Igor Pavlov",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "AIMP                                                           5.40.2675          Artem Izmaylov",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Android Studio                                                 2024.3             Google LLC",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Audacity 3.7.7                                                 3.7.7              Audacity Team",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "BlueStacks                                                     5.22.101.2017      now.gg, Inc.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Cisco Packet Tracer 8.2.2 64Bit                                8.2.2.400          Cisco Systems, Inc.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Docker Desktop                                                 4.60.1             Docker Inc.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Fairlight Audio Accelerator Utility                            1.0.15             Blackmagic Design",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "GAMS 53.4.0                                                    GAMS 53.4.0        GAMS Development",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Git                                                            2.49.0             The Git Development Community",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Hytale Launcher                                                2026.01.11-b022ef5 Hypixel Studios Canada inc.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "IntelliJ IDEA 2026.1                                           261.22158.277      JetBrains s.r.o.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Mozilla Firefox (x64 en-US)                                    150.0.1            Mozilla",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Mozilla Thunderbird (x64 en-US)                                148.0              Mozilla",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Mozilla Maintenance Service                                    148.0              Mozilla",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "MuseHub                                                        2.5.2.2063         Muse Group",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft 365 Apps for enterprise - en-us                      16.0.19929.20090   Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Octave 10.3.0                                                  10.3.0             GNU Octave",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Proton VPN                                                     4.3.7              Proton AG",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "QEMU                                                           10.1.94            QEMU Community",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "R for Windows 4.5.2                                            4.5.2              R Core Team",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Garry's Mod                                                                       Facepunch Studios",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Wallpaper Engine                                                                  Wallpaper Engine Team",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Tesseract-OCR - open source OCR engine                         5.5.0.20241111     Tesseract-OCR community",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Winaero Tweaker                                                1.63.0.0           Winaero",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "WinRAR 7.11 (64-bit)                                           7.11.0             win.rar GmbH",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "WizTree v4.26                                                  4.26               Antibody Software",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "XAMPP                                                          8.0.30-0           Apache Friends",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Zen Browser (x64 en-US)                                        1.19.11b           Zen OSS Team",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "NVIDIA Nsight Systems 2022.4.2                                 22.4.2.1           NVIDIA Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "LocalSend version 1.17.0                                       1.17.0             Tien Do Nam",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2013 x64 Additional Runtime - 12.0.40664  12.0.40664         Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Python 3.13.5 Documentation (64-bit)                           3.13.5150.0        Python Software Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft .NET Host FX Resolver - 9.0.15 (x64)                 72.60.50518        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Windows SDK DirectX x64 Remote                                 10.1.26100.3916    Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "DaVinci Resolve Control Panels                                 2.3.2.0            Blackmagic Design",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Video2X Qt6 version 6.4.0                                      6.4.0",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Free Download Manager                                          6.33.1.6648        Softdeluxe",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Lenovo Legion Toolkit version 2.26.1                           2.26.1             Bartosz Cichecki",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Strawberry Perl (64-bit)                                       5.42.1             strawberryperl.com project",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "DiagnosticsHub_CollectionService                               17.12.35318        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Oracle VirtualBox 7.2.6                                        7.2.6              Oracle and/or its affiliates",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Windows Desktop Runtime - 9.0.11 (x64)               72.44.42433        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft .NET Runtime - 9.0.11 (x64)                          72.44.42384        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Oh My Posh                                                     26.6.1             Jan De Dobbeleer",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Blender                                                        4.4.3              Blender Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "ClickUp                                                        3.5.150.0          ClickUp",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2010  x64 Redistributable - 10.0.40219    10.0.40219         Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Python 3.13.5 pip Bootstrap (64-bit)                           3.13.5150.0        Python Software Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "MPC-HC 2.4.3.6 (26b7859e2) Nightly (64-bit)                    2.4.3.6            MPC-HC Team",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Application Verifier x64 External Package                      10.1.22000.832     Microsoft",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft .NET Host - 8.0.26 (x64)                             64.104.50421       Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "GitHub CLI                                                     2.86.0             GitHub, Inc.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Universal CRT Tools x64                                        10.1.26100.3916    Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2012 x64 Additional Runtime - 11.0.61030  11.0.61030         Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "vs_communityx64msi                                             17.14.36025        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "NVIDIA Nsight Visual Studio Edition 2025.2.1.25125             25.2.1.25125       NVIDIA Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Python 3.13.5 Executables (64-bit)                             3.13.5150.0        Python Software Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2022 X64 Minimum Runtime - 14.44.35211    14.44.35211        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Windows Desktop Runtime - 9.0.15 (x64)               72.60.50530        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "CMake                                                          3.24.2             Kitware",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Windows Desktop Runtime - 8.0.22 (x64)               64.88.42561        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2013 x64 Minimum Runtime - 12.0.40664     12.0.40664         Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Application Verifier x64 External Package (DesktopEditions)    10.1.26100.3916    Microsoft",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "vs_devenx64vmsi                                                17.14.36015        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft System CLR Types for SQL Server 2019                 15.0.2000.5        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "vs_Graphics_Singletonx64                                       17.14.36015        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2008 Redistributable - x64 9.0.30729.6161 9.0.30729.6161     Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "RealVNC Viewer 7.15.1                                          7.15.1.18          RealVNC",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Windows App Certification Kit Native Components                10.1.26100.3916    Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Node.js                                                        22.16.0            Node.js Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "VS JIT Debugger                                                17.0.157.0         Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "spacedesk Windows DRIVER                                       2.2.14.0           datronicsoft Inc.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "icecap_collection_x64                                          17.14.36015        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual Studio Installer                              3.14.2082.42463    Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Processing                                                     4.4.10             Processing Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft .NET Host FX Resolver - 8.0.22 (x64)                 64.88.42551        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "PDFgear 2.1.14                                                 2.1.14             PDFgear",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Azkari                                                         0.1.0              azkari",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "fanumtag                                                       0.1.0              FanumTag",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Hoppscotch                                                     26.2.1             hoppscotch",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft Visual C++ 2022 X64 Additional Runtime - 14.44.35211 14.44.35211        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "vs_minshellx64msi                                              17.14.36015        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Office 16 Click-to-Run Extensibility Component                 16.0.19929.20032   Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "World Monitor                                                  2.5.23             worldmonitor",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Application Verifier x64 External Package (OnecoreUAP)         10.1.26100.3916    Microsoft",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Python 3.13.5 Core Interpreter (64-bit)                        3.13.5150.0        Python Software Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Microsoft .NET Runtime - 9.0.15 (x64)                          72.60.50518        Microsoft Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "NVIDIA Nsight Systems 2025.1.3                                 25.1.3.140         NVIDIA Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Python 3.13.5 Test Suite (64-bit)                              3.13.5150.0        Python Software Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "NVIDIA Nsight Systems 2023.1.2                                 23.1.2.43          NVIDIA Corporation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "PDFsam Basic                                                   5.3.2.0            Sober Lemur S.r.l.",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Python 3.13.5 Tcl/Tk Support (64-bit)                          3.13.5150.0        Python Software Foundation",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "Application Verifier x64 External Package (DesktopEditions)    10.1.22621.5040    Microsoft",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      },
      {
        "name": "DaVinci Resolve                                                20.0.00049         Blackmagic Design",
        "version": null,
        "vendor": null,
        "installLocation": null,
        "source": "registry"
      }
    ],
    "notes": [
      "Windows software parsing is simplified and should be refined for production."
    ]
  },
  "filesystem": null,
  "eventLogs": null,
  "browser": null,
  "usb": null,
  "risk": {
    "score": 55,
    "level": "medium",
    "signals": [
      "No enabled antivirus signal found",
      "Firewall status unknown",
      "OS update status unknown",
      "52 process(es) running from Downloads/Temp/AppData"
    ]
  }
}
```
