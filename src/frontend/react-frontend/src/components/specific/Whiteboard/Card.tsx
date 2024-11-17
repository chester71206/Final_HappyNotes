// react-frontend/src/components/specific/Whiteboard/Card.tsx

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'; 
import { CardData } from '@/interfaces/Card/CardData'; 
import { Rnd } from 'react-rnd'; 
import ResizeObserver from 'resize-observer-polyfill'; // 引入 ResizeObserver

// Interface for Card component props extending CardData
interface CardProps extends CardData {
    onUpdateCard: (cardId: string, updatedFields: Partial<CardData>) => void;
    onDelete: (cardId: string) => void; 
    isSelected: boolean; 
    onSelect: (cardId: string) => void; 
}

const Card: React.FC<CardProps> = React.memo(({ 
    _id,
    cardTitle,
    content,
    dueDate,
    tag,
    foldOrNot,
    position,
    dimensions,
    connection,
    connectionBy,
    comments,
    onUpdateCard,
    onDelete, 
    isSelected, 
    onSelect, 
}) => {
    // Local state for editing mode and input values
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editedTitle, setEditedTitle] = useState<string>(cardTitle);
    const [editedContent, setEditedContent] = useState<string>(content);
    const [isFolded, setIsFolded] = useState<boolean>(!!foldOrNot);
    const cardRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null); // Ref to the title element
    const prevHeightRef = useRef<number>(dimensions.height); // Store previous height
    const isAdjustingRef = useRef<boolean>(false); // Flag to prevent infinite loop

    // Function to adjust card height immediately without debounce 
    const adjustHeight = useCallback(() => {  
        if (cardRef.current && isEditing && !isFolded) {  
            const newHeight = Math.max(cardRef.current.scrollHeight, 100); 
            const heightDifference = newHeight - prevHeightRef.current; 

            console.log('Adjusting Height:', { newHeight, prevHeight: prevHeightRef.current, difference: heightDifference });

            if (Math.abs(heightDifference) > 0 && !isAdjustingRef.current) { 
                isAdjustingRef.current = true; // Prevent loop
                onUpdateCard(_id, { dimensions: { width: dimensions.width, height: newHeight } }); 
                prevHeightRef.current = newHeight; // Update previous height

                // Reset the flag in the next tick
                setTimeout(() => {
                    isAdjustingRef.current = false;
                }, 0);
            } 
        }  
    }, [dimensions.width, onUpdateCard, _id, isEditing, isFolded]); 

    // Function to save edited content and update the card  
    const handleSave = useCallback(() => {
        if (_id) {
            onUpdateCard(_id, {  
                cardTitle: editedTitle,  
                content: editedContent,  
                updatedAt: new Date()  
            });  
            setIsEditing(false);  
            adjustHeight(); // Adjust height immediately after saving 
        }  
    }, [ _id, onUpdateCard, editedTitle, editedContent, adjustHeight ]); 
    // Error handling: Ensure card ID is defined
    if (!_id) {
        console.error("Card component received undefined id");
        return null;
    }


    // Function to handle card deletion with confirmation
    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering onSelect
        const confirmDelete = window.confirm('你確定要刪除卡片嗎?');
        if (confirmDelete) {
            onDelete(_id);
        }
    }, [ _id, onDelete ]); 

    // Function to toggle fold state without affecting editing state  
    const handleToggleFold = useCallback((e: React.MouseEvent) => {  
        e.stopPropagation(); // Prevent triggering onSelect  
        setIsFolded(prev => {  
            const newFolded = !prev;  
            if (newFolded) {  
                // Folding: set height to title's height + padding/margin
                if (titleRef.current) {  
                    const titleHeight = titleRef.current.offsetHeight + 32; // 16px padding top and bottom
                    onUpdateCard(_id, { dimensions: { width: dimensions.width, height: titleHeight } });  
                    prevHeightRef.current = titleHeight; // Update previous height
                }  
            } else {  
                // Unfolding: set height based on content 
                if (cardRef.current) {  
                    const fullHeight = cardRef.current.scrollHeight;  
                    onUpdateCard(_id, { dimensions: { width: dimensions.width, height: fullHeight } });  
                    prevHeightRef.current = fullHeight; // Update previous height
                }  
            }  
            return newFolded;  
        });  
    }, [ onUpdateCard, _id, dimensions.width ]); 

    // Function to handle content change
    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedContent(e.target.value);

        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto'; // Reset height to auto  
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;  
            // Update card height in edit mode 
            adjustHeight();
        }
    }, [ adjustHeight ]); 

    // Ensure the textarea resizes correctly when entering edit mode 
    useLayoutEffect(() => { 
        if (isEditing && textAreaRef.current) { 
            textAreaRef.current.style.height = 'auto'; // Reset height to auto before measuring 
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`; 
            adjustHeight(); 
        } 
    }, [isEditing, adjustHeight]); 

    // Use ResizeObserver to observe height when resizing the card
    useEffect(() => {
        if (isEditing && !isFolded && cardRef.current) {
            const observer = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const { height } = entry.contentRect;
                    console.log('ResizeObserver:', height);
                    const newHeight = Math.max(height, 100);
                    if (Math.abs(newHeight - prevHeightRef.current) > 0 && !isAdjustingRef.current) {
                        isAdjustingRef.current = true;
                        onUpdateCard(_id, { dimensions: { width: dimensions.width, height: newHeight } });
                        prevHeightRef.current = newHeight;
                        setTimeout(() => {
                            isAdjustingRef.current = false;
                        }, 0);
                    }
                }
            });

            observer.observe(cardRef.current);

            return () => {
                observer.disconnect();
            };
        }
    }, [isEditing, isFolded, onUpdateCard, _id, dimensions.width]);

    // Adjust height when content or fold state changes 
    useEffect(() => {  
        if (isEditing && !isFolded) {  
            // Only adjust height when editing and not folded 
            adjustHeight();  
        } else {  
            // If not editing, ensure prevHeightRef is synced
            prevHeightRef.current = dimensions.height;
        }

        // Cleanup function 
        return () => { 
            // Reset the adjusting flag 
            isAdjustingRef.current = false;
        }; 
    }, [content, isFolded, adjustHeight, isEditing, dimensions.height]); 

    return (
        <Rnd  
            size={{ width: dimensions.width, height: dimensions.height }}  
            position={{ x: position.x, y: position.y }}  
            onDragStop={(e, d) => {  
                onUpdateCard(_id, { position: { x: d.x, y: d.y } });  
            }}  
            onResizeStop={(e, direction, ref, delta, position) => {  
                const newWidth = Math.max(parseInt(ref.style.width, 10), 150); // Minimum width 150px 
                const newHeight = Math.max(parseInt(ref.style.height, 10), 100); // Minimum height 100px 
                onUpdateCard(_id, {   
                    dimensions: { width: newWidth, height: newHeight },  
                    position: position  
                });  
                prevHeightRef.current = newHeight; // Update previous height 
                isAdjustingRef.current = false; // Reset adjusting flag
            }}  
            bounds="parent"  
            enableResizing={{  
                top: !isEditing,  
                right: true,  
                bottom: !isEditing,  
                left: true,  
                topRight: !isEditing,  
                bottomRight: !isEditing,  
                bottomLeft: !isEditing,  
                topLeft: !isEditing  
            }}  
            className={`${isSelected ? 'ring-4 ring-blue-500' : ''}`}  
            dragHandleClassName="drag-handle" // Use a specific drag handle 
            disableDragging={false} // Allow dragging 
        >  
            <div  
                className={`bg-blue-100 border border-blue-300 p-4 rounded shadow relative h-full w-full flex flex-col`}  
                onDoubleClick={() => setIsEditing(true)}  
                onClick={() => onSelect(_id)}   
                ref={cardRef}  
                style={{ boxSizing: 'border-box', transition: 'none', overflow: 'hidden' }} // Remove transitions and prevent overflow
            >
                {/* Fold button */}
                <button
                    onClick={handleToggleFold}
                    className="absolute top-0 left-2 text-gray-500 hover:text-gray-700 focus:outline-none"  
                    style={{ fontSize: '1.25rem' }} 
                    title={isFolded ? '展開卡片' : '摺疊卡片'}
                >
                    {isFolded ? '+' : '-'}
                </button>

                {/* Delete button */} 
                <button
                    onClick={handleDelete}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 focus:outline-none" 
                    title="Delete Card"
                >
                    &times;
                </button>

                {isEditing ? (
                    <div className="flex flex-col">
                        {/* edit content */}
                        <input  
                            type="text"  
                            value={editedTitle}  
                            onChange={(e) => setEditedTitle(e.target.value)}  
                            className="w-full px-2 py-1 border rounded mb-2 drag-handle"  
                            placeholder="Enter card title"  
                            style={{ boxSizing: 'border-box', transition: 'none' }}  
                        />  
                        {!isFolded && ( 
                            <> 
                                {/* Textarea for editing the card content */}  
                                <textarea  
                                    ref={textAreaRef}  
                                    placeholder="Enter content here"  
                                    value={editedContent}  
                                    onChange={handleContentChange}  
                                    className="w-full p-2 border rounded resize-none" // 移除 flex-shrink
                                    style={{ overflow: 'auto', boxSizing: 'border-box', transition: 'none' }}  
                                />  
                            </> 
                        )} 
                        {/* Button to save changes */}  
                        <button  
                            onClick={handleSave}  
                            className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none self-end"  
                        >  
                            Save  
                        </button>  
                    </div> 
                ) : (  
                    <div className="flex flex-col"> 
                        <h3 ref={titleRef} className="text-lg font-semibold drag-handle" style={{ transition: 'none' }}>{cardTitle}</h3>  
                        {!isFolded && <p className="mt-2 whitespace-pre-wrap" style={{ transition: 'none' }}>{content}</p>}  
                    </div> 
                )}  
            </div>  
        </Rnd>  
    ); 

}); 

export default Card;
