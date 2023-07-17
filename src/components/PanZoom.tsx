import {  StyleSheet, Text, View, Image, ViewStyle, Dimensions, StatusBar } from 'react-native'
import React, { FunctionComponent, ReactElement, Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
    const MAX_SCALE = 1.3;
    const {style, contentContainerStyle, children} = props;
    const animatedViewRef = useRef<any>(null);
    const rootViewRef = useRef<any>(null);
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const baseScale = useRef(new Animated.Value(1)).current
    const pinchScale = useRef(new Animated.Value(1)).current
    const lastScale = useRef(new Animated.Value(1)).current
    const [isZoomedIn, setIsZoomedIn] = useState(false)
    const [isPanGestureEnabled, setIsPanGestureEnabled] = useState(false)
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
    const [contentDimensions, setContentDimensions] = useState({ width: 1, height: 1 })
    const focalX = useRef(new Animated.Value(0)).current;
    const focalY = useRef(new Animated.Value(0)).current;
    const lastOffsetX = useRef(new Animated.Value(0)).current
    const lastOffsetY = useRef(new Animated.Value(0)).current
    const [statusBarHeight, setStatusBarHeight] = useState(0);
    const [childrenCount, setChildrenCount] = useState(0);

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

    const withSpring = ( anim: Animated.Value, toValue: number) => {
        if(!toValue) return;
        Animated.spring(anim, {
            toValue,
            useNativeDriver: true
        }).start();
    }

    const handleBoundaries = (translationX: number, translationY: number) => {
        const ADDITIONAL_OFFSET = 50;
        let finalTranslates = {
            x: 0,
            y: 0
        }
        finalTranslates.x = lastOffsetX.__getValue() + translationX / lastScale.__getValue()
        finalTranslates.y = lastOffsetY.__getValue() + translationY / lastScale.__getValue();
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
        animatedViewRef.current.measureInWindow((x: number,y: number,width: number, height: number)=>{
            const scaledHeight = contentDimensions.height*lastScale.__getValue();
            const scaledWidth = contentDimensions.width*lastScale.__getValue();
            if(x+scaledWidth<containerCorners.topLeft.x) {
                finalTranslates.x = translateX.__getValue()-((x+scaledWidth)/lastScale.__getValue())+ADDITIONAL_OFFSET/lastScale.__getValue();
            }
            if(y+scaledHeight<containerCorners.topLeft.y) {
                finalTranslates.y =  translateY.__getValue()-((y+scaledHeight)/lastScale.__getValue())+ADDITIONAL_OFFSET/lastScale.__getValue();
            }
            if(x>containerCorners.topRight.x) {
                finalTranslates.x = translateX.__getValue()-(x-containerCorners.topRight.x)/lastScale.__getValue()-ADDITIONAL_OFFSET/lastScale.__getValue();
            }
            if(y>containerCorners.bottomRight.y) {
                finalTranslates.y = translateY.__getValue()-(y-containerCorners.bottomRight.y)/lastScale.__getValue()-(ADDITIONAL_OFFSET+statusBarHeight)/lastScale.__getValue();
            }
            if(finalTranslates.x) {
                translateX.setValue(finalTranslates.x);
                lastOffsetX.setValue(translateX.__getValue());
            }
            if(finalTranslates.y) {
                translateY.setValue(finalTranslates.y);
                lastOffsetY.setValue(translateY.__getValue());
            }
        })
    }

    const zoomIn = useCallback((absoluteX: number, absoluteY: number) => {
        setIsZoomedIn(true) 
        setIsPanGestureEnabled(true)
        animatedViewRef.current?.measure((x:number, y: number, width: number, height: number, pageX:number, pageY: number) => {
            let newScale = MAX_SCALE;
            lastScale.setValue(newScale)
            withSpring(baseScale,newScale)
            withSpring(pinchScale,1)
            const newOffsetX = (lastOffsetX.__getValue()+pageX)/lastScale.__getValue();
            const newOffsetY = (lastOffsetY.__getValue()+pageY-statusBarHeight)/lastScale.__getValue();
            lastOffsetX.setValue(newOffsetX);
            lastOffsetY.setValue(newOffsetY);
            withSpring(translateX,newOffsetX)
            withSpring(translateY,newOffsetY)
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
        const newScale = baseScale.__getValue() * scale
        lastScale.setValue(newScale)
        if (newScale > 1) {
            setIsZoomedIn(true)
            baseScale.setValue(newScale)
            pinchScale.setValue(1)
            setIsPanGestureEnabled(true);
        } else {
            zoomOut()
        }
    }, [handleBoundaries, lastScale, baseScale, pinchScale, zoomOut, isZoomedIn])

    const panZoomGestures = useMemo(() => {
        const tapGesture = Gesture.Tap().enabled(isPanGestureEnabled).numberOfTaps(3).onEnd(({absoluteX, absoluteY}) => {
            onDoubleTap(absoluteX, absoluteY)
        })
        const panGesture = Gesture.Pan().enabled(isPanGestureEnabled).onStart(()=>{}).onUpdate(({ translationX, translationY, velocityX, velocityY }) => {
            if(!velocityX || !velocityY) {
                return;
            }
            translateX.setValue(lastOffsetX.__getValue() + translationX / lastScale.__getValue());
            translateY.setValue(lastOffsetY.__getValue() + translationY / lastScale.__getValue());
        }).onEnd(({ translationX, translationY }) => {
            handleBoundaries(translationX, translationY);
        }).minDistance(0).minPointers(1).maxPointers(2)
        const pinchGesture = Gesture.Pinch().onUpdate(({ scale, focalX:x, focalY:y }) => {
            pinchScale.setValue(scale)
            focalX.setValue(x)
            focalY.setValue(y)
            setIsPanGestureEnabled(true);
        }).onEnd(({ scale, focalX, focalY }) => {
            pinchScale.setValue(scale)
            onPinchEnd(scale, focalX, focalY);
        })
        return Gesture.Race(tapGesture, Gesture.Simultaneous(tapGesture,pinchGesture, panGesture))
    }, [ handleBoundaries ,lastOffsetX, lastOffsetY, onDoubleTap, onPinchEnd, isPanGestureEnabled, pinchScale, translateX, translateY, lastScale ])

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
    },
    debug: {
        borderRadius: 5,
        width: 10,
        height: 10,
        backgroundColor: 'cyan'
    }
})