import { useEffect, useRef } from "react";

function MapContainer({ places, selectedPlace, onMarkerClick, mapCenter }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const infoWindowRef = useRef(null)
    const markersRef = useRef([])

    useEffect(() => {
        if (window.kakao && window.kakao.maps) {
            const options = {
                center: new kakao.maps.LatLng(37.5665, 126.9780),
                level: 3
            }
            const kakaoMap = new kakao.maps.Map(mapRef.current, options)
            mapInstanceRef.current = kakaoMap
            infoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 1 })

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude
                    const lon = position.coords.longitude
                    const locPosition = new kakao.maps.LatLng(lat, lon)
                    kakaoMap.setCenter(locPosition)
                    new kakao.maps.Marker({ map: kakaoMap, position: locPosition })
                })
            }
        } else {
            console.error("카카오맵 API가 로드되지 않았습니다.")
        }
    }, [])
    
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !mapCenter) return

        const position = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng)
        map.panTo(position)
    }, [mapCenter])

    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        if (!places || places.length === 0) return

        const bounds = new kakao.maps.LatLngBounds()
        const newMarkers = []

        places.forEach(place => {
            const position = new kakao.maps.LatLng(place.y, place.x)
            const marker = new kakao.maps.Marker({ map, position })

            kakao.maps.event.addListener(marker, 'click', () => {
                onMarkerClick(place)
            })

            newMarkers.push(marker)
            bounds.extend(position)
        })

        markersRef.current = newMarkers
        map.setBounds(bounds)
    }, [places, onMarkerClick])

    useEffect(() => {
        const map = mapInstanceRef.current
        const infoWindow = infoWindowRef.current
        if (!map || !infoWindow) return

        if (!selectedPlace) {
            infoWindow.close()
            return
        }

        const placeIndex = places.findIndex(p => p.id === selectedPlace.id)
        const targetMarker = markersRef.current[placeIndex]

        if (!targetMarker) {
            infoWindow.close()
            return
        }

        const position = new kakao.maps.LatLng(selectedPlace.y, selectedPlace.x)
        infoWindow.setContent(`<div style="padding: 5px; font-size: 12px;">${selectedPlace.place_name}</div>`)
        infoWindow.open(map, targetMarker)
        map.panTo(position)
    }, [selectedPlace, places])

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
        ></div>
    )
}

export default MapContainer