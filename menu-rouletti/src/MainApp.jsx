import { useCallback, useEffect, useState } from "react"
import MyList from "./MyList.jsx"
import Roulette from "./Roulette.jsx"
import MapContainer from "./MapContainer.jsx"
import { auth, db } from "./firebase"
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"

const SearchPanel = ({ places, onPlaceClick, onOpenModal, onSearch }) => {
    const [inputText, setInputText] = useState("")

    const handleSearchClick = () => {
        if (!inputText.trim()) {
            alert("검색어를 입력해주세요!")
            return
        }
        onSearch(inputText)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '5px' }}>
                <input
                    placeholder="맛집 검색 (예: 강남역 돈까스)"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box'}}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && handleSearchClick()}
                />
                <button onClick={handleSearchClick} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>검색</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto'}}>
                {(!places || places.length === 0) ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>검색 결과가 없습니다.</div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {places.map((place, index) => (
                            <li key={index} style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>
                                <div onClick={() => onPlaceClick(place)} style={{ cursor: 'pointer' }}>
                                    <strong style={{ fontSize: '16px' }}>{place.place_name}</strong>
                                    <p style={{ fontSize: '12px', color: 'gray', margin: '5px 0 0 0' }}>{place.address_name}</p>
                                </div>
                                <button onClick={() => onOpenModal(place)} style={{ marginTop: '5px', padding: '3px 8px', fontSize:' 12px' }}>
                                    My List 저장
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

const SaveModal = ({ place, isOpen, onClose, onSave }) => {
    const [menuName, setMenuName] = useState("")
    const [locationTag, setLocationTag] = useState("")
    const [memo, setMemo] = useState("")
    const [userTags, setUserTags] = useState([])

    useEffect(() => {
        if (isOpen && auth.currentUser) {
            const fetchUserTags = async () => {
                const userRef = doc(db, "Users", auth.currentUser.uid)
                const userSnap = await getDoc(userRef)
                if (userSnap.exists() && userSnap.data().locations) {
                    const locations = userSnap.data().locations
                    const tagNames = locations.map(loc => loc.name)
                    setUserTags(tagNames)
                } else {
                    setUserTags([])
                }
            }
            fetchUserTags()
        }
    }, [isOpen])

    const handleSaveClick = () => {
        if (!menuName.trim() || !locationTag.trim()) {
            alert("메뉴와 거점을 모두 입력해주세요!")
            return
        }

        setMenuName("")
        setLocationTag("")
        setMemo("")
        onSave(menuName, locationTag, memo)
    }

    const handleClose = () => {
        setMenuName("")
        setLocationTag("")
        setMemo("")
        onClose()
    }

    if (!isOpen || !place) return null

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width:'100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '300px' }}>
                <h3>{place.place_name}</h3>
                <p>이 가게를 My List에 저장할까요?</p>

                <div style={{ margin: '20px 0' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>메뉴 이름 *</label>
                        <input
                            type="text"
                            placeholder="예: 제육볶음, 돈까스"
                            value={menuName}
                            onChange={(e) => setMenuName(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>내 태그 선택 *</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px'}}>
                            {userTags.map((tag, index) => (
                                <button
                                    key={index}
                                    onClick={() => setLocationTag(tag)}
                                    style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '20px',
                                        background: locationTag === tag ? '#e0e0ff' : '#f9f9f9', cursor: 'pointer' }}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="또는 새 태그 입력 (예: 회사, 집)"
                            value={locationTag}
                            onChange={(e) => setLocationTag(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>한 줄 메모(선택)</label>
                        <textarea placeholder="예: 불맛이 최고!, 양이 많음" value={memo} onChange={(e) => setMemo(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', height: '60px', resize: 'vertical' }} />
                    </div>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={handleClose}>취소</button>
                    <button onClick={handleSaveClick} style={{ marginLeft: '10px'}}>저장</button>
                </div>
            </div>
        </div>
    )
}

const LocationManager = ({ onTagClick }) => {
    const [locations, setLocations] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        const fetchLocationsAndCounts = async () => {
            if (!auth.currentUser) return

            try {
                const menuListQuery = query(
                    collection(db, "MyMenuList"),
                    where("user_id", "==", auth.currentUser.uid)
                )
                const menuListSnap = await getDocs(menuListQuery)

                const tagCounts = {}
                menuListSnap.forEach(doc => {
                    const tag = doc.data().location_tag
                    if (tag) {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1
                    }
                })

                const userRef = doc(db, "Users", auth.currentUser.uid)
                const userSnap = await getDoc(userRef)

                if (userSnap.exists() && userSnap.data().locations) {
                    const userLocations = userSnap.data().locations
                    const combinedLocations = userLocations.map(loc => ({
                        ...loc,
                        count: tagCounts[loc.name] || 0
                    }))
                    const sortedLocations = combinedLocations.sort((a, b) => a.order - b.order)
                    setLocations(sortedLocations)
                } else {
                    setLocations([])
                }
            } catch (error) {
                console.error("거점 목록 또는 MyList 개수 불러오기 실패: ", error)
            }
        }
        fetchLocationsAndCounts()
        // 메모
        // TODO: Firestore 'locations'가 변경될 때 실시간으로 업데이트하려면
        // onSnapshot 리스너를 사용하는 것을 고려해볼 수 있습니다.
    }, [])

    const renderManagementModal = () => {
        if (!isModalOpen) return null

        return (
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', background: 'white', border: '1px solid #ccc',
                        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100 }}>
                <h2 style={{ padding: '15px 20px', margin: 0, borderBottom: '1px solid #eee', fontSize: '18px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    거점 태그 관리
                    <button onClick={() => setIsModalOpen(false)}
                        style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#555' }}>
                        &times;
                    </button>
                </h2>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '400px', overflowY: 'auto'}}>
                    {locations.map(loc => (
                        <li key={loc.id} style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #eee'}}>
                            <div style={{ flex: 1, marginRight: '10px' }}>
                                <strong style={{ fontSize: '16px'}}>
                                    {loc.name} ({loc.count}개)
                                </strong>
                                <p style={{ fontSize: '12px', color: 'gray', margin: '4px 0 0 0' }}>
                                    {loc.address || "위치 미설정"}
                                </p>
                            </div>
                            <button onClick={() => console.log("수정 클릭: ", loc)}
                                style={{ fontSize: '12px', padding: '4px 8px', marginRight: '5px' }}>
                                수정
                            </button>
                            <button onClick={() => console.log("삭제 클릭: ", loc)}
                                style={{ fontSize: '12px', padding: '4px 8px', marginRight: '10px', color: 'red', borderColor: 'red' }}>
                                삭제
                            </button>
                            <span style={{ fontSize: '18px', cursor: 'grab'}}>☰</span>
                        </li>
                    ))}
                </ul>

                <div style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
                    <button onClick={() => console.log("새 거점 추가 클릭")} style={{ width: '100%', padding: '10px', fontSize: '16px' }}>
                        +
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div style={{
                position: 'absolute', top: '20px', left: '370px', zIndex: 11,
                background: 'white', padding: '5px 10px', borderRadius: '20px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', gap: '5px'
            }}>
                {locations.map(loc => (
                    <button key={loc.id} onClick={() => onTagClick(loc)}>
                        {loc.name}
                    </button>
                ))}
                <button onClick={() => setIsModalOpen(true)} style={{ fontWeight: 'bold', padding: '0 8px'}}>
                    ☰
                </button>
            </div>

            {renderManagementModal()}
        </>
    )
}

function MainApp({ onLogout }) {
    // ('search', 'mylist', 'roulette')
    const [currentTab, setCurrentTab] = useState('search')
    const [isScriptLoaded, setIsScriptLoaded] = useState(false)

    const [places, setPlaces] = useState([])
    const [selectedPlace, setSelectedPlace] = useState(null)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalPlaceData, setModalPlaceData] = useState(null)

    useEffect(() => {
        const script = document.createElement('script')
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_KEY}&autoload=false&libraries=services`
        script.async = true
        document.head.appendChild(script)

        script.onload = () => {
            kakao.maps.load(() => {
                setIsScriptLoaded(true)
                console.log("카카오맵 스크립트 로딩 완료")
            })
        }
    }, [])

    const handleSearch = (searchText) => {
        if (!isScriptLoaded) return
        if (!searchText.trim()) {
            alert("검색어를 입력해주세요!")
            return
        }

        const ps = new kakao.maps.services.Places()
        ps.keywordSearch(searchText, (data, status, pagination) => {
            if (status === kakao.maps.services.Status.OK) {
                console.log("검색 결과: ", data)
                setPlaces(data)
                setSelectedPlace(null)
            } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
                alert("검색 결과가 존재하지 않습니다.")
                setPlaces([])
            } else if (status === kakao.maps.services.Status.ERROR) {
                alert("검색 중 오류가 발생했습니다.")
            }
        })
    }

    const handleSave = async (menuName, locationTag, memo) => {
        if (!auth.currentUser || !modalPlaceData) return

        const place = modalPlaceData
        const tag = locationTag.trim()

        if (!tag) {
            alert("태그를 입력하거나 선택해주세요!")
            return
        }

        try {
            await setDoc(doc(db, "Shops", place.id), {
                shop_id: place.id,
                name: place.place_name,
                address: place.address_name,
                x: place.x,
                y: place.y
            })

            await addDoc(collection(db, "MyMenuList"), {
                user_id: auth.currentUser.uid,
                shop_id: place.id,
                menu_name: menuName,
                location_tag: tag,
                memo: memo,
                created_at: new Date()
            })

            const userRef = doc(db, "Users", auth.currentUser.uid)
            const userSnap = await getDoc(userRef)
            const locations = userSnap.exists() && userSnap.data().locations ? userSnap.data().locations : []

            const tagExists = locations.some(loc => loc.name === tag)

            if (!tagExists) {
                const newLocation = {
                    id: uuidv4(),
                    name: tag,
                    lat: null,
                    lng: null,
                    address: null,
                    order: locations.length
                }

                await updateDoc(userRef, {
                    locations: arrayUnion(newLocation)
                })
                console.log("새로운 거점 태그 객체를 추가했습니다.", newLocation)
            } else {
                console.log("이미 존재하는 태그 이름입니다.")
            }

            alert("저장 완료!")
            handleCloseModal()
        } catch (error) {
            console.error("저장 중 에러 발생: ", error)
            alert("저장에 실패했습니다.")
        }
    }

    const handleSelectPlace = useCallback((place) => {
        setSelectedPlace(place)
    }, [])

    const handleOpenModal = (place) => {
        setModalPlaceData(place)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setModalPlaceData(null)
    }

    const renderPanelContent = () => {
        switch (currentTab) {
            case 'search':
                return (
                    <SearchPanel
                        places={places}
                        onPlaceClick={handleSelectPlace}
                        onOpenModal={handleOpenModal}
                        onSearch={handleSearch}
                    />
                )
            case 'mylist':
                return <MyList />
            case 'roulette':
                return <Roulette />
            default:
                return <SearchPanel places={places} onPlaceClick={handleSelectPlace} onOpenModal={handleOpenModal} onSearch={handleSearch}/>
        }
    }

    if (!isScriptLoaded) {
        return <div>지도 로딩 중...</div>
    }

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

            {/* 왼쪽 패널 */}
            <div style={{ width: '350px', height: '100vh', position: 'absolute', left: 0, top: 0, background: 'white',
                borderRight: '1px solid #ddd', boxShadow: '2px 0 5px rgba(0,0,0,0.1)', zIndex: 10,
                display: 'flex', flexDirection: 'column' }}>

                {/* 검색창 + 탭 버튼 */}
                <div style={{ padding: '10px'}}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => setCurrentTab('search')} style={getTabStyle(currentTab === 'search')}>검색</button>
                        <button onClick={() => setCurrentTab('mylist')} style={getTabStyle(currentTab === 'mylist')}>My List</button>
                        <button onClick={() => setCurrentTab('roulette')} style={getTabStyle(currentTab === 'roulette')}>룰렛</button>
                    </div>
                </div>

                {/* 패널 하단 (정보 목록 창) */}
                <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #eee' }}>
                    {renderPanelContent()}
                </div>
            </div>

            {/* 지도 화면 영역 (패널 뒤 전체) */}
            <div style={{ width: '100%', height: '100vh'}}>
                <MapContainer
                    places={places}
                    selectedPlace={selectedPlace}
                    onMarkerClick={handleSelectPlace}
                />
            </div>

            {/* 거점 태그 */}
            <LocationManager onTagClick={(loc) => console.log("선택된 거점: ", loc)}/>

            {/* 로그아웃 버튼 */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 11, background: 'white',
                padding: '8px 12px', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                <span style={{ marginRight: '10px', fontWeight: 'bold' }}>{auth.currentUser.displayName}</span>
                <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>
                    로그아웃
                </button>
            </div>

            <SaveModal
                place={modalPlaceData}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
            />
        </div>
    )
}

const getTabStyle = (isActive) => ({
    flex: 1,
    padding: '8px',
    background: isActive ? '#007bff' : '#f0f0f0',
    color: isActive ? 'white' : 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal'
})

export default MainApp