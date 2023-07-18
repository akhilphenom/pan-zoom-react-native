import {  StyleSheet, Text, View, Image, ViewStyle, Dimensions, StatusBar } from 'react-native'
import React, { FunctionComponent, ReactElement, Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Gesture, GestureDetector, GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

type IProps = {
    style?: ViewStyle, 
    contentContainerStyle?: ViewStyle, 
    children: ReactElement
}

interface PanZoomRef {
    setPanning: (value: boolean) => void;
}

const PanZoomComponent = (props: IProps, ref: Ref<PanZoomRef>) => {
    const MAX_SCALE = 1.3;
    const {style, contentContainerStyle, children} = props;
    const animatedViewRef = useRef<any>(null);
    const rootViewRef = useRef<any>(null);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const baseScale = useSharedValue(1);
    const pinchScale = useSharedValue(1);
    const lastScale = useSharedValue(1);
    const [isZoomedIn, setIsZoomedIn] = useState(false)
    const [isPanGestureEnabled, setIsPanGestureEnabled] = useState(false)
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
    const [contentDimensions, setContentDimensions] = useState({ width: 1, height: 1 })
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);
    const lastOffsetX = useSharedValue(0)
    const lastOffsetY = useSharedValue(0)
    const [statusBarHeight, setStatusBarHeight] = useState(0);
    const [childrenCount, setChildrenCount] = useState(0);

    const rStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { scale: baseScale.value*pinchScale.value },
          { translateX: translateX.value },
          { translateY: translateY.value  },
        ]}
    })

    const debug = useAnimatedStyle(()=>{
      return {
        transform: [
          { translateX: focalX.value },
          { translateY: focalY.value  },
        ]
      }
    });

    useLayoutEffect(() => {
        const getStatusBarHeight = () => {
            setStatusBarHeight(StatusBar.currentHeight as number ?? 0);
        };
        getStatusBarHeight();

        const updateStatusBarHeight = () => {
            const { height } = Dimensions.get('window');
            getStatusBarHeight();
            setStatusBarHeight((prevHeight) => {
                if (prevHeight === height) return StatusBar.currentHeight || 0;
                return prevHeight;
            });
        };

        Dimensions.addEventListener('change', updateStatusBarHeight);
        return () => {
            Dimensions.addEventListener('change', updateStatusBarHeight);
        };
    }, []);

    const handleBoundaries = (translationX: number, translationY: number) => {
        const ADDITIONAL_OFFSET = 50;
        let finalTranslates = {
            x: 0,
            y: 0
        }
        finalTranslates.x = lastOffsetX.value + translationX / lastScale.value
        finalTranslates.y = lastOffsetY.value + translationY / lastScale.value;
        const containerCorners: {[key: string]: {
            x: number, 
            y: number
        }} = {
            topLeft: {
                x: 0,
                y: 0
            },
            topRight: {
                x: containerDimensions.width,
                y: 0,
            },
            bottomLeft: {
                x: 0,
                y: (containerDimensions.height)+statusBarHeight,
            },
            bottomRight: {
                x: containerDimensions.width,
                y: (containerDimensions.height)+statusBarHeight,
            },
        }
        animatedViewRef.current?.measureInWindow((x: number,y: number,width: number, height: number)=>{
            const scaledHeight = contentDimensions.height*lastScale.value;
            const scaledWidth = contentDimensions.width*lastScale.value;
            if(x+scaledWidth<containerCorners.topLeft.x) {
                finalTranslates.x = translateX.value-((x+scaledWidth)/lastScale.value)+ADDITIONAL_OFFSET/lastScale.value;
            }
            if(y+scaledHeight<containerCorners.topLeft.y) {
                finalTranslates.y =  translateY.value-((y+scaledHeight)/lastScale.value)+ADDITIONAL_OFFSET/lastScale.value;
            }
            if(x>containerCorners.topRight.x) {
                finalTranslates.x = translateX.value-(x-containerCorners.topRight.x)/lastScale.value-ADDITIONAL_OFFSET/lastScale.value;
            }
            if(y>containerCorners.bottomRight.y) {
                finalTranslates.y = translateY.value-(y-containerCorners.bottomRight.y)/lastScale.value-(ADDITIONAL_OFFSET+statusBarHeight)/lastScale.value;
            }
            if(finalTranslates.x) {
                translateX.value =(finalTranslates.x);
                lastOffsetX.value = (translateX.value);
            }
            if(finalTranslates.y) {
                translateY.value = (finalTranslates.y);
                lastOffsetY.value = (translateY.value);
            }
        })
    }

    const zoomIn = useCallback((absoluteX: number, absoluteY: number) => {
        setIsZoomedIn(true) 
        setIsPanGestureEnabled(true)
        animatedViewRef.current?.measure((x:number, y: number, width: number, height: number, pageX:number, pageY: number) => {
            let newScale = MAX_SCALE;
            lastScale.value = (newScale)
            baseScale.value = newScale
            pinchScale.value = 1
            const newOffsetX = (lastOffsetX.value+pageX)/lastScale.value;
            const newOffsetY = (lastOffsetY.value+pageY)/lastScale.value;
            lastOffsetX.value = (newOffsetX);
            lastOffsetY.value = (newOffsetY);
            translateX.value = newOffsetX
            translateY.value = newOffsetY
        });
    }, [animatedViewRef,handleBoundaries,baseScale, pinchScale, lastOffsetX, lastOffsetY, translateX, translateY, isZoomedIn, lastScale])

    const zoomOut = useCallback(() => {
        setIsZoomedIn(false)
        setIsPanGestureEnabled(true)
    }, [animatedViewRef,handleBoundaries,baseScale, pinchScale, lastOffsetX, lastOffsetY, translateX, translateY, lastScale, isZoomedIn])

    const onDoubleTap = useCallback((absoluteX:number, absoluteY:number) => {
        if (!isZoomedIn) {
            zoomIn(absoluteX, absoluteY)
        } else {
            zoomOut()
        }
    }, [zoomIn, zoomOut, isZoomedIn])

    const onLayout = useCallback(({ nativeEvent: { layout: { width, height } } }) => {
        setContainerDimensions(state => ({
            width,
            height,
        }))
    }, [isPanGestureEnabled])

    const onLayoutContent = useCallback(({ nativeEvent: { layout: { width, height } } }) => {
        setContentDimensions(state => ({
            width,
            height,
        }))
    }, [isPanGestureEnabled])

    const onPinchEnd = useCallback((scale: number, x: number, y: number) => {
        'worklet';
        const newScale = baseScale.value * scale
        lastScale.value = (newScale)
        runOnJS(setIsZoomedIn)(true)
        baseScale.value = (newScale)
        pinchScale.value = (1)
        runOnJS(setIsPanGestureEnabled)(true);
    }, [handleBoundaries, lastScale, baseScale, pinchScale, zoomOut, isZoomedIn, focalX, focalY, isPanGestureEnabled])

    const panZoomGestures = useMemo(() => {
        const tapGesture = Gesture.Tap().numberOfTaps(2).onEnd(({absoluteX, absoluteY}) => {
            onDoubleTap(absoluteX, absoluteY)
        })
        const panGesture = Gesture.Pan().enabled(isPanGestureEnabled).onUpdate(({ translationX, translationY, velocityX, velocityY }) => {
            translateX.value = (lastOffsetX.value + translationX / lastScale.value);
            translateY.value = (lastOffsetY.value + translationY / lastScale.value);
        }).onEnd(({ translationX, translationY }) => {
            runOnJS(handleBoundaries)(translationX, translationY);
        }).minDistance(0).minPointers(1).maxPointers(2)
        const pinchGesture = Gesture.Pinch().onUpdate((e) => {
            const {focalX:previousFocalX, focalY:previousFocalY, velocity, scale} = e;
            if(!velocity) {
                return;
            }
            pinchScale.value = (scale)
            const translateXValue = previousFocalX - focalX.value * lastScale.value;
            const translateYValue = previousFocalY - focalY.value * lastScale.value;
            translateX.value = (translateXValue);
            translateY.value = (translateYValue);
        }).onEnd(({ scale, focalX, focalY }) => {
            pinchScale.value = (scale)
            onPinchEnd(scale, focalX, focalY);
        })
        return Gesture.Simultaneous(pinchGesture, panGesture )
    }, [ handleBoundaries ,lastOffsetX, lastOffsetY, onDoubleTap, onPinchEnd, isPanGestureEnabled, pinchScale, translateX, translateY, lastScale, focalX, focalY ])

    useEffect(() => {
        const count = React.Children.count(children);
        setChildrenCount(count);
    }, [children]);

    useImperativeHandle(ref, () => ({
        setPanning: (value: boolean) => {
            setIsPanGestureEnabled(state => value);
        },
    }));

    return (
        <GestureHandlerRootView style={{flex:1}}>
            <GestureDetector gesture={panZoomGestures}>
                <View
                style={[styles.container, style]}
                ref={rootViewRef}
                onLayout={onLayout}
                collapsable={false}
                >
                    <Animated.View
                    style={[rStyle,{
                        alignSelf: 'flex-start'
                    }, contentContainerStyle]}
                    onLayout={onLayoutContent}
                    ref={animatedViewRef}
                    >
                        {children}
                    </Animated.View>
                    <Animated.View style={[styles.debug, debug]}>

                    </Animated.View>
                </View>
            </GestureDetector>
        </GestureHandlerRootView>   
    )
}

export const PanZoomReanimated = forwardRef(PanZoomComponent);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    debug: {
        borderRadius: 5,
        width: 10,
        height: 10,
        backgroundColor: 'cyan',
        position:'absolute'
    }
})