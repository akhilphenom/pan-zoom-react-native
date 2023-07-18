import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';

const ZoomView = ({children}) => {
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const focalX = useRef(0);
  const focalY = useRef(0);

  const [panState, setPanState] = useState(State.UNDETERMINED);
  const [pinchState, setPinchState] = useState(State.UNDETERMINED);

  const handlePanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handlePanHandlerStateChange = event => {
    setPanState(event.nativeEvent.state);
  };

  const handlePinchGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          scale: pinchScale,
          focalX: new Animated.Value(focalX.current),
          focalY: new Animated.Value(focalY.current),
        },
      },
    ],
    { useNativeDriver: true }
  );

  const handlePinchHandlerStateChange = event => {
    setPinchState(event.nativeEvent.state);
    if (event.nativeEvent.state === State.BEGAN) {
      focalX.current = event.nativeEvent.focalX;
      focalY.current = event.nativeEvent.focalY;
    }
  };

  const animatedStyle = {
    transform: [
      { scale: Animated.multiply(baseScale, pinchScale) },
      { translateX },
      { translateY },
    ],
  };

  return (
    <View style={styles.container}>
        <GestureHandlerRootView style={{flex:1}}>
            <PinchGestureHandler
                onGestureEvent={handlePinchGestureEvent}
                onHandlerStateChange={handlePinchHandlerStateChange}
                simultaneousHandlers="panGesture"
            >
                <Animated.View style={styles.container}>
                    <PanGestureHandler
                        onGestureEvent={handlePanGestureEvent}
                        onHandlerStateChange={handlePanHandlerStateChange}
                        simultaneousHandlers="pinchGesture"
                    >
                        <Animated.View style={animatedStyle}>
                            {children}
                        </Animated.View>
                    </PanGestureHandler>
                </Animated.View>
            </PinchGestureHandler>
        </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ZoomView;
