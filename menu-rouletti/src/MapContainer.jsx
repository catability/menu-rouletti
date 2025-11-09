import { useEffect, useRef, useState } from "react";
import { db, auth } from "./firebase.js";
import { doc, setDoc, collection, addDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

function MapContainer() {
    const mapRef = useRef(null)
    const infoWindowRef = useRef(null)

    const [map, setMap] = useState(null)
    const [inputText, setInputText] = useState("")
    const [places, setPlaces] = useState([])
    const [markers, setMarkers] = useState([])

    const [selectedPlace, setSelectedPlace] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const [menuName, setMenuName] = useState("")
    const [locationTag, setLocationTag] = useState("")
    const [userTags, setUserTags] = useState([])
    
    useEffect(() => {
        const script = document.createElement("script")
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_KEY}&autoload=false&libraries=services`
        script.async = true
        document.head.appendChild(script)

        script.onload = () => {
            kakao.maps.load(() => {
                const options = {
                    center: new kakao.maps.LatLng(37.5665, 126.9780),
                    level: 3
                }
                const kakaoMap = new kakao.maps.Map(mapRef.current, options)
                setMap(kakaoMap)

                infoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 1 })

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                        const lat = position.coords.latitude
                        const lon = position.coords.longitude

                        const locPosition = new kakao.maps.LatLng(lat, lon)

                        kakaoMap.setCenter(locPosition)

                        new kakao.maps.Marker({
                            map: kakaoMap,
                            position: locPosition
                        })
                    })
                    console.log("현재 위치로 이동 완료!")
                }
            })
        }
    }, [])

    useEffect(() => {
        if (isModalOpen && auth.currentUser) {
            const fetchUserTags = async () => {
                const userRef = doc(db, "Users", auth.currentUser.uid)
                const userSnap = await getDoc(userRef)
                if (userSnap.exists() && userSnap.data().tags) {
                    setUserTags(userSnap.data().tags)
                } else {
                    setUserTags([])
                }
            }
            fetchUserTags()
        }
    }, [isModalOpen])

    const handleSearch = () => {
        if (!inputText.trim()) {
            alert("검색어를 입력해주세요!")
            return
        }

        const ps = new kakao.maps.services.Places()

        ps.keywordSearch(inputText, (data, status, pagination) => {
            if (status === kakao.maps.services.Status.OK) {
                console.log("검색 결과: ", data)
                setPlaces(data)
                displayPlaces(data)
            } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
                alert("검색 결과가 존재하지 않습니다.")
                setPlaces([])
            } else if (status === kakao.maps.services.Status.ERROR) {
                alert("검색 중 오류가 발생했습니다.")
            }
        })
    }

    const displayPlaces = (places) => {
        markers.forEach(marker => marker.setMap(null))
        const newMarkers = []

        const bounds = new kakao.maps.LatLngBounds()

        for (let i = 0; i < places.length; i++) {
            const place = places[i]
            const position = new kakao.maps.LatLng(place.y, place.x)

            const marker = new kakao.maps.Marker({
                map: map,
                position: position
            })
            newMarkers.push(marker)

            kakao.maps.event.addListener(marker, 'click', () => {
                map.panTo(position)

                infoWindowRef.current.setContent(`<div style="padding: 5px; font-size: 12px;">${place.place_name}</div>`)
                infoWindowRef.current.open(map, marker)
            })

            bounds.extend(position)
        }

        setMarkers(newMarkers)

        map.setBounds(bounds)
    }

    const handlePlaceClick = (place) => {
        const position = new kakao.maps.LatLng(place.y, place.x)

        map.panTo(position)

        infoWindowRef.current.setContent(`<div style="padding: 5px; font-size: 12px;">${place.place_name}</div>`)
        infoWindowRef.current.open(map, new kakao.maps.Marker({ position, map }))
    }

    const handleOpenModal = (place) => {
        setSelectedPlace(place)
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!menuName.trim() || !locationTag.trim()) {
            alert("메뉴와 거점을 모두 입력해주세요!")
            return
        }

        if (!auth.currentUser) {
            alert("로그인이 필요합니다.")
            return
        }

        try {
            await setDoc(doc(db, "Shops", selectedPlace.id), {
                shop_id: selectedPlace.id,
                name: selectedPlace.place_name,
                address: selectedPlace.address_name,
                x: selectedPlace.x,
                y: selectedPlace.y
            })

            await addDoc(collection(db, "MyMenuList"), {
                user_id: auth.currentUser.uid,
                shop_id: selectedPlace.id,
                menu_name: menuName,
                location_tag: locationTag,
                created_at: new Date()
            })

            if (locationTag.trim() && !userTags.includes(locationTag.trim())) {
                try {
                    const userRef = doc(db, "Users", auth.currentUser.uid)
                    await updateDoc(userRef, {
                        tags: arrayUnion(locationTag.trim())
                    })
                    console.log("새로운 태그가 등록되었습니다.", locationTag)
                } catch (error) {
                    console.error("태그 업데이트 실패", error)
                }
            }

            alert("저장 완료!")
            setIsModalOpen(false)
            setMenuName("")
            setLocationTag("")

        } catch (error) {
            console.error("저장 중 에러 발생: ", error)
            alert("저장에 실패했습니다.")
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            {/* 검색창 영역 */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                <input
                    placeholder="맛집 검색 (예: 강남역 돈까스)"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch}>검색</button>
            </div>

            {/* 결과 목록 영역 */}
            {places.length > 0 && (
                <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 10,
                background: 'white', width: '300px', maxHeight: '500px', overflowY: 'auto',
                padding: '10px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                    <h3>검색 결과</h3>
                    <ul>
                        {places.map((place, index) => (
                            <li
                            key={index}
                            style={{ marginBottom: '10px', borderBottom: '1px solid #eee' }}
                            >
                                <div onClick={() => handlePlaceClick(place)} style={{ cursor: 'pointer' }}>
                                    <strong>{place.place_name}</strong>
                                    <p style={{ fontSize: '12px', color: 'grey' }}>{place.address_name}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        // e.stopPropagation()
                                        handleOpenModal(place)
                                    }}
                                    style={{ marginTop: '5px', padding: '3px 8px'}}
                                >
                                    저장
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 실제 지도 */}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

            { isModalOpen && selectedPlace && (
                <div style={{ position: 'fixed', top: 0, left: 0, width:'100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '300px' }}>
                        <h3>{selectedPlace.place_name}</h3>
                        <p>이 가게를 My List에 저장할까요?</p>
                        {/* 나중에 여기에 입력 필드들이 들어갈 예정 */}

                        <div style={{ margin: '20px 0' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>메뉴 이름 *</label>
                                <input
                                    type="text"
                                    placeholder="예: 제육볶음, 돈까스"
                                    value={menuName}
                                    onChange={(e) => setMenuName(e.target.value)}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box'}}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>내 태그 선택 *</label>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {userTags.map((tag, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setLocationTag(tag)}
                                            style={{
                                                padding: '5px 10px',
                                                fontSize: '12px',
                                                border: '1px solid #ddd',
                                                borderRadius: '20px',
                                                background: locationTag === tag ? '#e0e0ff' : '#f9f9f9',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                    { userTags.length === 0 && <span style={{ fontSize: '12px', color: 'gray'}}>저장된 태그가 없습니다.</span>}
                                </div>

                                <input
                                    type="text"
                                    placeholder="예: 회사, 집, 학교"
                                    value={locationTag}
                                    onChange={(e) => setLocationTag(e.target.value)}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box'}}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button onClick={() => {
                                setIsModalOpen(false)
                                setMenuName("")
                                setLocationTag("")
                            }}>
                                취소
                            </button>
                            <button onClick={handleSave} style={{ marginLeft: '10px' }}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MapContainer