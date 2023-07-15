import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import {PanZoom} from './src/components/PanZoom';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  const PADDING = 20;
  const panZoomRef = useRef<any>(null);
  const contentRef = useRef(null);
  const [panning, setPanning] = useState(false);
  const [parentWidth, setParentWidth] = useState(0);
  const [parentHeight, setParentHeight] = useState(0);
  const [childrenDimensions, setChildrenDimensions] = useState<{
    width: number,
    height: number
  }[]>([]);

  const handleChildLayout = useCallback((index: number,event: LayoutChangeEvent) => {
    event.persist();
    const { width, height, x, y } = event.nativeEvent.layout;
    setChildrenDimensions(prevDimensions => {
      const updatedDimensions = [...prevDimensions];
      updatedDimensions[index] = { 
        width: width+x, 
        height: height+y
      };
      return updatedDimensions;
    });
  }, [])

  const calculateParentDimensions = useCallback(() => {
    let maxWidth = 0;
    let maxHeight = 0;
    for(let childDimensions of childrenDimensions) {
      if (childDimensions && childDimensions.width > maxWidth) {
        maxWidth = childDimensions.width;
      }
      if (childDimensions && childDimensions.height > maxHeight) {
        maxHeight = childDimensions.height;
      }
    };
    setParentWidth(maxWidth);
    setParentHeight(maxHeight);
  },[parentHeight, parentWidth, childrenDimensions])

  const handlePanning = () => {
    setPanning(panning => !panning)
  }
  const handleTouchableOpacityPress = () => {
    console.log('Pressed')
  }
  useEffect(()=>{
    panZoomRef.current.setPanning(panning)
  }, [panning])
  return (
    <SafeAreaView style={styles.container}>
      <PanZoom 
      ref={panZoomRef}
      >
        <View style={{
          width: parentWidth,
          height: parentHeight,
          borderWidth: 1,
        }}
        ref={contentRef}
        onLayout={calculateParentDimensions}>
          {
            [].constructor(20).fill(1).map((item,index: number) => {
              return (
                <TouchableOpacity style={{
                  backgroundColor: 'yellow',
                  width: 25,
                  height: 25,
                  position: 'absolute',
                  top: index*25,
                  left: index*25
                }}
                onLayout={event => handleChildLayout(index, event)}
                key={index}
                disabled={panning}
                onPress={handleTouchableOpacityPress}
                >
                  
                </TouchableOpacity>
              )
            })
          }
        </View>
      </PanZoom>
      <TouchableOpacity style={styles.floatingBtn} onPress={handlePanning}>
        <MaterialIcons style={styles.palmIcon} name="pan-tool" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 35,
    right: 35,
    backgroundColor: 'cadetblue',
    borderRadius: 25,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  palmIcon: {
    top: -2,
    left: -2
  }
});
