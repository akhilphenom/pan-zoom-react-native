import React, { useRef } from 'react';
import { StyleSheet, Image, Dimensions, Animated } from 'react-native';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

// Credit to Mariana Ibanez https://unsplash.com/photos/NJ8Z8Y_xUKc
const imageUri =
  'https://images.unsplash.com/photo-1621569642780-4864752e847e?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=668&q=80';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width, height } = Dimensions.get('window');

function App() {
    const focalX = useRef(new Animated.Value(0)).current;
    const focalY = useRef(new Animated.Value(0)).current;
    const baseScale = useRef(new Animated.Value(1)).current;
    const pinchScale = useRef(new Animated.Value(1)).current;
    const lastScale = useRef(1);

    const pinchGestureEvent = Animated.event(
        [{ nativeEvent: { scale: pinchScale, focalX, focalY } }],
        { useNativeDriver: true }
    )

    const onPinchHandlerStateChange = (event) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            lastScale.current *= event.nativeEvent.scale;
            baseScale.setValue(lastScale.current);
            pinchScale.setValue(1);
        }
    };

    return (
        <PinchGestureHandler onGestureEvent={pinchGestureEvent} onHandlerStateChange={onPinchHandlerStateChange}>
            <Animated.View style={{ flex: 1 }}>
                <AnimatedImage
                style={[{ flex: 1 }, {
                    transform: [
                        { translateX: focalX },
                        { translateY: focalY },
                        { translateX: -width / 2 },
                        { translateY: -height / 2 },
                        { scale: Animated.multiply(baseScale,pinchScale) },
                        { translateX: Animated.multiply(new Animated.Value(-1),focalX) },
                        { translateY: Animated.multiply(new Animated.Value(-1),focalY) },
                        { translateX: width / 2 },
                        { translateY: height / 2 },
                    ],
                }]}
                source={{ uri: imageUri }}
                />
                <Animated.View style={[styles.focalPoint, {
                    transform: [{ translateX: focalX }, { translateY: focalY }],
                }]} />
            </Animated.View>
        </PinchGestureHandler>
    );
}

export default () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <App />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focalPoint: {
    ...StyleSheet.absoluteFillObject,
    width: 20,
    height: 20,
    backgroundColor: 'blue',
    borderRadius: 10,
  },
});