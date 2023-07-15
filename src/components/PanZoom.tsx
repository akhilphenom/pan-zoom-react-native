import {  StyleSheet, Text, View, Image, ViewStyle, Dimensions, StatusBar } from 'react-native'
import React, { FunctionComponent, ReactElement, Ref, forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Animated } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';

type IProps = {
    style?: ViewStyle, 
    contentContainerStyle?: ViewStyle, 
    children: ReactElement
}

interface PanZoomRef {
    setPanning: (value: boolean) => void;
}

const PanZoomComponent = (props: IProps, ref: Ref<PanZoomRef>) => {
    const {style, contentContainerStyle, children} = props;
    const animatedViewRef = useRef<View>(null);
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const baseScale = useRef(new Animated.Value(1)).current
    const pinchScale = useRef(new Animated.Value(1)).current
    const lastScale = useRef(new Animated.Value(1)).current
    const [isZoomedIn, setIsZoomedIn] = useState(false)
    const [isPanGestureEnabled, setIsPanGestureEnabled] = useState(false)
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
    const [contentDimensions, setContentDimensions] = useState({ width: 1, height: 1 })
    const lastOffsetX = useRef(new Animated.Value(0)).current
    const lastOffsetY = useRef(new Animated.Value(0)).current
    const balancerOffsetX = useRef(new Animated.Value(0)).current
    const balancerOffsetY = useRef(new Animated.Value(0)).current
    const [statusBarHeight, setStatusBarHeight] = useState(0);

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

    const getContentContainerSize = () => {
        return ({
          width: containerDimensions.width,
          height: contentDimensions.height * containerDimensions.width / contentDimensions.width,
        })
    }

    const withSpring = ( anim: Animated.Value, toValue: number) => {
        Animated.spring(anim, {
            toValue,
            useNativeDriver: true
        }).start();
    }

    const zoomIn = useCallback(() => {
        const { width, height } = getContentContainerSize()
        let newScale = width > height ? width / height * 0.8 : height / width * 0.8
        if (newScale < 1.4) {
            newScale = 1.4
        } else if (newScale > 1.5) {
            newScale = 1.5
        }
        lastScale.setValue(newScale)
        withSpring(baseScale,newScale)
        withSpring(pinchScale,1)

        const newOffsetX = 0
        lastOffsetX.setValue(newOffsetX)

        const newOffsetY = 0
        lastOffsetY.setValue(newOffsetY) 

        translateX.setValue(newOffsetX) 
        translateY.setValue(newOffsetY) 

        setIsZoomedIn(true) 
        setIsPanGestureEnabled(true)
    }, [baseScale, pinchScale, lastOffsetX, lastOffsetY, translateX, translateY, isZoomedIn, lastScale])

    const zoomOut = useCallback(() => {
        const newScale = 1;
        lastScale.setValue(newScale)
        withSpring(baseScale,newScale)
        withSpring(pinchScale,1)

        const newOffsetX = 0
        lastOffsetX.setValue(newOffsetX)

        const newOffsetY = 0
        lastOffsetY.setValue(newOffsetY)

        withSpring(translateX,newOffsetX)
        withSpring(translateY,newOffsetY)

        setIsZoomedIn(false)
        setIsPanGestureEnabled(false)
    }, [baseScale, pinchScale, lastOffsetX, lastOffsetY, translateX, translateY, lastScale, isZoomedIn])

    const onDoubleTap = useCallback(() => {
        if (isZoomedIn) {
            zoomOut()
        } else {
            zoomIn()
        }
    }, [zoomIn, zoomOut, isZoomedIn])

    const onLayout = useCallback(({ nativeEvent: { layout: { width, height } } }) => {
        setContainerDimensions(state => ({
            width,
            height,
        }))
    }, [])

    const onLayoutContent = useCallback(({ nativeEvent: { layout: { width, height } } }) => {
        setContentDimensions(state => ({
            width,
            height,
        }))
    }, [])

    const onPinchEnd = useCallback((scale: number) => {
        const newScale = lastScale.__getValue() * scale
        lastScale.setValue(newScale)
        if (newScale > 1) {
            setIsZoomedIn(true)
            baseScale.setValue(newScale)
            pinchScale.setValue(1)
            setIsPanGestureEnabled(true);
        } else {
            zoomOut()
        }
    }, [lastScale, baseScale, pinchScale, zoomOut, isZoomedIn])

    const panZoomGestures = useMemo(() => {
        const ADDITIONAL_OFFSET = 50;
        const tapGesture = Gesture.Tap().numberOfTaps(4).onEnd(() => {
            onDoubleTap()
        })
        const panGesture = Gesture.Pan().onUpdate(({ translationX, translationY, velocityX, velocityY }) => {
            if(!velocityX || !velocityY) {
                return;
            }
            translateX.setValue(lastOffsetX.__getValue() + translationX / lastScale.__getValue()),
            translateY.setValue(lastOffsetY.__getValue() + translationY / lastScale.__getValue())
        }).onEnd(({ translationX, translationY }) => {
            let finalTranslates = {
                x: null,
                y: null
            }
            finalTranslates.x = lastOffsetX.__getValue() + translationX / lastScale.__getValue()
            finalTranslates.y = lastOffsetY.__getValue() + translationY / lastScale.__getValue();
            let coordinates: {[key: string]: {
                x: number, 
                y: number
            }} = {
                topLeft: {x:0,y:0},
                topRight: {x:0,y:0},
                bottomLeft: {x:0,y:0},
                bottomRight: {x:0,y:0},
            }
            animatedViewRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
                const containerCorners: {[key: string]: {
                    x: number, 
                    y: number
                }} = {
                    topLeft: {
                        x: 0,
                        y: 0
                    },
                    topRight: {
                        x: containerDimensions.width/lastScale.__getValue(),
                        y: 0,
                    },
                    bottomLeft: {
                        x: 0,
                        y: (containerDimensions.height)/lastScale.__getValue()+statusBarHeight,
                    },
                    bottomRight: {
                        x: containerDimensions.width/lastScale.__getValue(),
                        y: (containerDimensions.height)/lastScale.__getValue()+statusBarHeight,
                    },
                }
                coordinates = {
                    topLeft: {x: pageX, y: pageY-statusBarHeight},
                    topRight: {x: pageX+contentDimensions.width, y: pageY-statusBarHeight},
                    bottomLeft: {x: pageX, y: pageY-statusBarHeight+(contentDimensions.height/lastScale.__getValue())},
                    bottomRight: {x: pageX+(contentDimensions.width)/lastScale.__getValue(), y: pageY-statusBarHeight+(contentDimensions.height)/lastScale.__getValue()},
                }
                if(coordinates.bottomLeft.y<=containerCorners.topLeft.y) {
                    if(coordinates.topRight.x>containerCorners.topLeft.x && coordinates.topLeft.x<containerCorners.topRight.x) {
                        finalTranslates.x = lastOffsetX.__getValue() + translationX / lastScale.__getValue();
                    }
                    finalTranslates.y = translateY.__getValue() - (translateY.__getValue()+(containerDimensions.height/lastScale.__getValue())-(ADDITIONAL_OFFSET/lastScale.__getValue()));
                }
                else if(coordinates.topLeft.y>=containerCorners.bottomLeft.y-statusBarHeight) {
                    if(coordinates.topRight.x>containerCorners.topLeft.x && coordinates.topLeft.x<containerCorners.topRight.x) {
                        finalTranslates.x = lastOffsetX.__getValue() + translationX / lastScale.__getValue();
                    }
                    finalTranslates.y = translateY.__getValue() - (translateY.__getValue()-(containerDimensions.height/lastScale.__getValue())+(ADDITIONAL_OFFSET/lastScale.__getValue()));
                } else {
                    lastOffsetX.setValue(lastOffsetX.__getValue() + translationX / lastScale.__getValue())
                    lastOffsetY.setValue(lastOffsetY.__getValue() + translationY / lastScale.__getValue());
                }
                if(finalTranslates.x) {
                    translateX.setValue(finalTranslates.x);
                }
                if(finalTranslates.y) {
                    translateY.setValue(finalTranslates.y);
                }
                if(translateX) {
                    balancerOffsetX.setValue(translateX.__getValue() - lastOffsetX.__getValue());
                    lastOffsetX.setValue(translateX.__getValue() - (balancerOffsetX.__getValue()/lastScale.__getValue()));
                }
                if(translateY) {
                    balancerOffsetY.setValue(translateY.__getValue() - lastOffsetY.__getValue());
                    lastOffsetY.setValue(translateY.__getValue() - (balancerOffsetY.__getValue()/lastScale.__getValue()));
                }
            });
            // lastOffsetX.setValue(lastOffsetX.__getValue() + translationX / lastScale.__getValue())
            // lastOffsetY.setValue(lastOffsetY.__getValue() + translationY / lastScale.__getValue());
        }).minDistance(0).minPointers(1).maxPointers(2)
        const pinchGesture = Gesture.Pinch().onUpdate(({ scale }) => {
            pinchScale.setValue(scale)
            setIsPanGestureEnabled(true);
        }).onEnd(({ scale }) => {
            pinchScale.setValue(scale)
            onPinchEnd(scale);
        })
        return Gesture.Race(tapGesture, Gesture.Simultaneous(tapGesture,pinchGesture, panGesture))
    }, [ lastOffsetX, lastOffsetY, onDoubleTap, onPinchEnd, isPanGestureEnabled, pinchScale, translateX, translateY, lastScale ])
  
    useImperativeHandle(ref, () => ({
        setPanning: (value: boolean) => {
            setIsPanGestureEnabled(value);
        },
    }));

    return (
        <GestureHandlerRootView style={{flex:1}}>
            <GestureDetector gesture={panZoomGestures}>
                <View
                style={[styles.container, style]}
                onLayout={onLayout}
                collapsable={false}
                >
                    <Animated.View
                    style={[{
                        transform: [
                            { scale: Animated.multiply(baseScale, pinchScale) },
                            { translateX: translateX },
                            { translateY: translateY },
                        ],
                        alignSelf: 'flex-start'
                    }, contentContainerStyle]}
                    onLayout={onLayoutContent}
                    ref={animatedViewRef}
                    >
                        {children}
                    </Animated.View>
                </View>
            </GestureDetector>
        </GestureHandlerRootView>   
    )
}

export const PanZoom = forwardRef(PanZoomComponent);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderColor: 'blue',
        borderWidth: 1,
    },
})