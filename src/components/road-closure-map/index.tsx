import { lineString } from '@turf/helpers';
import {
  forEach,
  isEmpty,
  isNil,
  omitBy
} from 'lodash';
import * as mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as React from 'react';
import { IRoadClosureState } from 'src/store/road-closure';
// import BaseControl from '../base-map-control';
import './road-closure-map.css';

(mapboxgl as any).accessToken = "pk.eyJ1IjoidHJhbnNwb3J0cGFydG5lcnNoaXAiLCJhIjoiY2ptOTN5N3Q3MHN5aDNxbGs2MzhsN3dneiJ9.K4j9mXsvfGCYtM8YouwCKg";

export interface IRoadClosureMapProps {
  findMatchedStreet: () => void,
  pointSelected: (payload: any) => void,
  roadClosure: IRoadClosureState
};

export interface IRoadClosureMapState {
  viewport: object
}

class RoadClosureMap extends React.Component<IRoadClosureMapProps, IRoadClosureMapState> {
  public state = {
    selectedPoints: [],
    viewport: {
      latitude: 47.608791594905625,
      longitude: -122.3348826226224,
      zoom: 13
    },
  }

  public mapContainer: any;

  public componentDidMount() {
    const {
      viewport: {
        latitude,
        longitude,
        zoom,
      }
    } = this.state;

    this.mapContainer = new mapboxgl.Map({
      center: [longitude, latitude],
      container: 'SHST-RoadClosure-Map',
      style: 'mapbox://styles/mapbox/streets-v9',
      zoom
    });

    this.mapContainer.on('move', this.handleMapMove);
    this.mapContainer.on('click', this.handleMapClick);
  }

  public componentDidUpdate(prevProps: IRoadClosureMapProps) {
    const {
      currentIndex,
      currentSelectionIndex,
      items
    } = this.props.roadClosure;

    const selectedPointsCurrentStreet = items[currentIndex].selectedPoints[currentSelectionIndex];

    const prevCurrentIndex = prevProps.roadClosure.currentIndex;
    const prevCurrentStreetIndex = prevProps.roadClosure.currentSelectionIndex;
    
    // draw point on click 
    if (!isEmpty(selectedPointsCurrentStreet) &&
      currentIndex === prevCurrentIndex &&
      currentSelectionIndex === prevCurrentStreetIndex) {
        forEach(items[currentIndex].selectedPoints, (selectedPointsForStreet, index) => {
          const lngLat = selectedPointsForStreet[selectedPointsForStreet.length-1] as any;
          const el = document.createElement('div');
          el.className = 'SHST-Map-Point-Marker';
          new mapboxgl.Marker(el)
            .setLngLat(lngLat)
            .addTo(this.mapContainer);

          if (selectedPointsForStreet.length >= 2) {
            const coords: any = [];
            selectedPointsForStreet.forEach((v: any) => {
              coords.push([v.lng, v.lat])
            });
            // coords.push([lngLat.lng, lngLat.lat]);
            const linestring = lineString(coords);
      
            this.drawLineFromGeojson("SHST-user-line"+linestring.id, linestring, "orange", [2,1], 0.35, 6);
          }
        });
    }

    // draw SharedStreets matched lines after API response
    if (!this.props.roadClosure.isFetchingMatchedStreets && prevProps.roadClosure.isFetchingMatchedStreets) {
      forEach(items[currentIndex].matchedStreets, (matchedStreetList, outerIndex) => {
        forEach(matchedStreetList, (matchedStreet, index) => {
          this.drawLineFromGeojson("SHST-match-geom-line-"+outerIndex+index, matchedStreet, "blue", null, 0.35, 6);
        })
      });
    }
    
  }

  public handleViewportChange = (viewport: any) => {
    this.setState({viewport});
  }

  public handleMapMove = () => {
    const { lng, lat } = this.mapContainer.getCenter();
    this.setState({
      viewport: {
        latitude: lat.toFixed(4),
        longitude: lng.toFixed(4),
        zoom: this.mapContainer.getZoom().toFixed(2)
      }
    });
  }

  public handleMapClick = (event: any) => {
    const {
      roadClosure: {
        currentIndex,
        currentSelectionIndex,
        items,
      }
    } = this.props;

    this.props.pointSelected(event.lngLat);
    if (items[currentIndex].selectedPoints[currentSelectionIndex] && items[currentIndex].selectedPoints[currentSelectionIndex].length > 1) {
      this.props.findMatchedStreet();
    }
  }

  public drawLineFromGeojson(id: string, geojsonData: object, color: string, dasharray: number[] | null, opacity: number, width: number) {
    let paintObj = {
      "line-color": color,
      "line-dasharray" : dasharray,
      "line-opacity": opacity,
      "line-width": width,
    };
    paintObj = omitBy(paintObj, isNil) as any;

    if (typeof this.mapContainer.getLayer(id) !== 'undefined') {
      this.mapContainer.removeLayer(id);
      this.mapContainer.removeSource(id);
    }
    this.mapContainer.addSource(id, {
      data: geojsonData,
      type: "geojson"
    });
    this.mapContainer.addLayer({
      "id": id,
      "paint": paintObj,
      "source": id,
      "type": "line",
    });
  }

  public render() {
    return (
      <div className={'SHST-RoadClosure-Map-Container'}>
        <div id={'SHST-RoadClosure-Map'} style={{
          height: '100%',
          margin: '0 auto',
          width: '100%',
        }} />
      </div>
    );
  }
}

export default RoadClosureMap;