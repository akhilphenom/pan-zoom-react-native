import { StyleSheet, Text, View } from 'react-native';
import {PanZoom} from './src/components/PanZoom';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRef } from 'react';

export default function App() {
  const panZoomRef = useRef<any>(null);
  const contentRef = useRef(null);
  const onGraphLayout = (e) => {
    contentRef.current.measure((x, y, width: number, height: number) => {
      console.log(width, height)
      // setTimeout(()=> {panZoomRef?.current?.setInnerDimensions(width, height)}, 1000)
    });
  }
  return (
    <SafeAreaView style={styles.container}>
      <PanZoom 
      ref={panZoomRef}
      >
        <View onLayout={onGraphLayout} ref={contentRef} style={{alignSelf: 'flex-start'}}>
            <TouchableOpacity style={{
              backgroundColor: 'yellow',
              width: 200,
              height :900,
              borderWidth: 5,
              borderColor: 'red'
            }}
            onPress={()=>console.log('hheheeh')}
            >
              <Text style={{fontSize: 42}}>
                Lorem ipsum dolor sit amet consectetur, adipisicing elit. Voluptatibus, laboriosam voluptates porro facilis ratione maiores, sit aspernatur nemo illo temporibus sed beatae a architecto hic necessitatibus velit voluptas ipsum laudantium.
              </Text>
            </TouchableOpacity>
        </View>
      </PanZoom>
      <TouchableOpacity style={styles.floatingBtn}>
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
