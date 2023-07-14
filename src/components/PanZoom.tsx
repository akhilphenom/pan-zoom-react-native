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
    setInnerContentDimensions: (width: number, height: number) => void
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
    const [statusBarHeight, setStatusBarHeight] = useState(0);
    const [innerContentDimensions, setInnerContentDimensions] = useState({
        width: 1,
        height: 1
    })

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

    const distance = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const findClosestCorner = (x: number, y: number, containerCorners: {
        [key: string]: {
            x: number, 
            y: number
        }
    }) => {
        let closestCorner = {
            ...containerCorners.topLeft
        };
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let corner in containerCorners ) {
            const dx = x - containerCorners[corner].x;
            const dy = y - containerCorners[corner].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if(distance<minDistance) {
                minDistance = distance;
                closestCorner = {
                    ...containerCorners[corner]
                }
            }
        }
        return closestCorner;
    };

    const handleBoundaries = () => {
        if(!animatedViewRef.current) {
            return false;
        }
        let isInsideBoundary = true;
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
                    x: containerDimensions.width,
                    y: 0,
                },
                bottomLeft: {
                    x: 0,
                    y: containerDimensions.height+statusBarHeight,
                },
                bottomRight: {
                    x: containerDimensions.width,
                    y: containerDimensions.height+statusBarHeight,
                },
            }
            coordinates = {
                topLeft: {x: pageX, y: pageY-statusBarHeight},
                topRight: {x: pageX+contentDimensions.width, y: pageY-statusBarHeight},
                bottomLeft: {x: pageX, y: pageY-statusBarHeight+contentDimensions.height},
                bottomRight: {x: pageX+contentDimensions.width, y: pageY-statusBarHeight+contentDimensions.height},
            }
            const extremeX = (containerDimensions.width-(contentDimensions.width));
            const extremeY = (containerDimensions.height- contentDimensions.height);
            const newPageY = pageY-statusBarHeight;
            if (
                (pageX<0&&(newPageY<=0||newPageY>=containerCorners.bottomLeft.y)) || 
                (pageX>containerDimensions.width&&(newPageY<=0||newPageY>=containerCorners.bottomLeft.y))
            ) {
                console.log('he')
                isInsideBoundary = false
            } else if ((coordinates.bottomLeft.y<0&&(coordinates.topLeft.x>=0|| coordinates.topRight.x<=containerDimensions.width))) {
                isInsideBoundary = false;
                console.log('hes')
            } else if ((coordinates.topLeft.y>=containerDimensions.height && coordinates.topRight.x<=containerDimensions.width)) {
                isInsideBoundary = false
                console.log('heaa')
            } else if(pageX >= 0 && pageX <= extremeX && pageY >= 0 && pageY <= extremeY) {
                isInsideBoundary = true;
                console.log('hep')
            }
        });
        console.log(isInsideBoundary)
        return isInsideBoundary
    }

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
        console.log(width, height)
    }, [])

    const onPinchEnd = useCallback((scale: number) => {
        const newScale = lastScale.__getValue() * scale
        lastScale.setValue(newScale)
        if (newScale > 1) {
            setIsZoomedIn(true)
            baseScale.setValue(newScale)
            pinchScale.setValue(1)
            // handlePanOutside()
            setIsPanGestureEnabled(true);
        } else {
            zoomOut()
        }
    }, [lastScale, baseScale, pinchScale, zoomOut, isZoomedIn])

    const panZoomGestures = useMemo(() => {
        const ADDITIONAL_OFFSET = 50;
        const tapGesture = Gesture.Tap().numberOfTaps(2).onEnd(() => {
            onDoubleTap()
        })
        const panGesture = Gesture.Pan().onUpdate(({ translationX, translationY, velocityX, velocityY }) => {
            if(!velocityX || !velocityY) {
                return;
            }
            // let finalTranslates = {
            //     x: lastOffsetX.__getValue() + translationX / lastScale.__getValue(),
            //     y: lastOffsetY.__getValue() + translationY / lastScale.__getValue()
            // }
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
                        x: containerDimensions.width,
                        y: 0,
                    },
                    bottomLeft: {
                        x: 0,
                        y: containerDimensions.height+statusBarHeight,
                    },
                    bottomRight: {
                        x: containerDimensions.width,
                        y: containerDimensions.height+statusBarHeight,
                    },
                }
                coordinates = {
                    topLeft: {x: pageX, y: pageY-statusBarHeight},
                    topRight: {x: pageX+contentDimensions.width, y: pageY-statusBarHeight},
                    bottomLeft: {x: pageX, y: pageY-statusBarHeight+contentDimensions.height},
                    bottomRight: {x: pageX+contentDimensions.width, y: pageY-statusBarHeight+contentDimensions.height},
                }
                const newPageY = pageY-statusBarHeight;
                console.log(translateY)
                if(coordinates.bottomLeft.y<=containerCorners.topLeft.y) {
                    if(coordinates.topRight.x>containerCorners.topLeft.x && coordinates.topLeft.x<containerCorners.topRight.x) {
                        finalTranslates.x = lastOffsetX.__getValue() + translationX / lastScale.__getValue();
                    }
                    console.log(contentDimensions.height/lastScale.__getValue())
                    finalTranslates.y = lastOffsetY.__getValue() - (translateY.__getValue()+(contentDimensions.height/lastScale.__getValue())-ADDITIONAL_OFFSET) / lastScale.__getValue();
                }
                if(coordinates.topLeft.y>=containerCorners.bottomLeft.y-statusBarHeight) {
                    if(coordinates.topRight.x>containerCorners.topLeft.x && coordinates.topLeft.x<containerCorners.topRight.x) {
                        finalTranslates.x = lastOffsetX.__getValue() + translationX / lastScale.__getValue();
                    }
                    finalTranslates.y = lastOffsetY.__getValue() - (translateY.__getValue()-containerDimensions.height+ADDITIONAL_OFFSET) / lastScale.__getValue();
                }
                if(finalTranslates.x) {
                    translateX.setValue(finalTranslates.x);
                }
                if(finalTranslates.y) {
                    translateY.setValue(finalTranslates.y);
                }
            });
            // lastOffsetX.setValue(lastOffsetX.__getValue() + translationX / lastScale.__getValue())
            // lastOffsetY.setValue(lastOffsetY.__getValue() + translationY / lastScale.__getValue());
            if(translateX) {
                lastOffsetX.setValue(translateX.__getValue())
            }
            if(translateY) {
                lastOffsetY.setValue(translateY.__getValue());
            }
        }).minDistance(0).minPointers(1).maxPointers(2)
        const pinchGesture = Gesture.Pinch().onUpdate(({ scale }) => {
            pinchScale.setValue(scale)
            setIsPanGestureEnabled(true);
        }).onEnd(({ scale }) => {
            pinchScale.setValue(scale)
            onPinchEnd(scale);
        })
        return Gesture.Race(tapGesture, Gesture.Simultaneous(tapGesture,pinchGesture, panGesture))
    }, [handleBoundaries, lastOffsetX, lastOffsetY, onDoubleTap, onPinchEnd, isPanGestureEnabled, pinchScale, translateX, translateY, lastScale])
  
    useImperativeHandle(ref, () => ({
        setPanning: (value: boolean) => {
            setIsPanGestureEnabled(value);
        },
        setInnerContentDimensions: (width, height) => {
            setInnerContentDimensions(state => ({width, height}))
        }
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