import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Heart, X, MessageSquare } from 'lucide-react';
import { sheetsService } from '../services/sheets';
import '../styles/CardStack.css';

const CardStack = ({ user, onActionComplete }) => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [showCommentModal, setShowCommentModal] = useState(false);

    // Track the direction of the swipe for the exit animation
    const [exitDirection, setExitDirection] = useState(null);

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        if (cards.length === 0) setLoading(true);
        try {
            const data = await sheetsService.fetchRows();
            // Sort by ID so we process in order
            const sortedData = data.sort((a, b) => a.id - b.id);
            setCards(sortedData);
        } catch (error) {
            console.error("Failed to load cards", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = async (card, status) => {
        try {
            // Optimistic update: remove card immediately from UI
            setCards(prev => prev.slice(1));

            // Send update in background
            await sheetsService.updateRowStatus(card.id, status, user, comment);
            setComment('');

            if (cards.length <= 1) {
                // If this was the last card (or close to it), reload or finish
                setTimeout(() => {
                    if (cards.length === 0) {
                        onActionComplete();
                    } else {
                        loadCards();
                    }
                }, 500);
            }
        } catch (error) {
            console.error("Action failed", error);
        }
    };

    const onDragEnd = (event, info) => {
        const swipeThreshold = 100;
        const { offset, velocity } = info;

        if (offset.x > swipeThreshold || velocity.x > 500) {
            setExitDirection('right');
            handleSwipe(cards[0], 'Approved');
        } else if (offset.x < -swipeThreshold || velocity.x < -500) {
            setExitDirection('left');
            handleSwipe(cards[0], 'Rejected');
        }
    };

    const handleButtonAction = (action) => {
        if (cards.length === 0) return;

        if (action === 'approve') {
            setExitDirection('right');
            handleSwipe(cards[0], 'Approved');
        } else if (action === 'reject') {
            setExitDirection('left');
            handleSwipe(cards[0], 'Rejected');
        }
    };

    const handleCommentSubmit = async () => {
        if (!comment.trim()) {
            alert("Please add a comment first!");
            return;
        }

        if (cards.length > 0) {
            setExitDirection('right'); // Treat review as a positive/forward action visually
            await handleSwipe(cards[0], 'Review');
            setShowCommentModal(false);
        }
    };

    if (loading && cards.length === 0) return <div className="loading">Loading cards...</div>;
    if (cards.length === 0) return <div className="empty-state">No more content to review!</div>;

    // We only render the top 2 cards for performance
    const visibleCards = cards.slice(0, 2);

    return (
        <div className="card-stack-container">
            <div className="cards-wrapper">
                <AnimatePresence mode='popLayout'>
                    {visibleCards.map((card, index) => {
                        const isTop = index === 0;
                        return (
                            <Card
                                key={card.id}
                                card={card}
                                isTop={isTop}
                                onDragEnd={onDragEnd}
                                exitDirection={exitDirection}
                            />
                        );
                    }).reverse()}
                </AnimatePresence>
            </div>

            <div className="action-bar">
                <button className="action-btn reject" onClick={() => handleButtonAction('reject')}>
                    <X size={24} />
                </button>
                <button className="action-btn comment" onClick={() => setShowCommentModal(true)}>
                    <MessageSquare size={24} />
                </button>
                <button className="action-btn approve" onClick={() => handleButtonAction('approve')}>
                    <Heart size={24} fill="currentColor" />
                </button>
            </div>

            {showCommentModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add Comment for Review</h3>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Type your comment here..."
                            rows={4}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button onClick={() => {
                                setComment('');
                                setShowCommentModal(false);
                            }}>Cancel</button>
                            <button
                                className="review-btn"
                                onClick={handleCommentSubmit}
                            >
                                Save & Mark as Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Card = ({ card, isTop, onDragEnd, exitDirection }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    const variants = {
        enter: { scale: 0.9, y: 30, opacity: 0 },
        center: {
            scale: 1,
            y: 0,
            opacity: 1,
            x: 0,
            rotate: 0,
            transition: { duration: 0.3 }
        },
        exit: (direction) => ({
            x: direction === 'left' ? -1000 : 1000,
            rotate: direction === 'left' ? -45 : 45,
            opacity: 0,
            transition: { duration: 0.3 }
        })
    };

    // Background card style
    const backCardStyle = {
        scale: 0.95,
        y: 10,
        zIndex: 0,
        opacity: 0.6
    };

    return (
        <motion.div
            className="card-deck"
            style={{
                zIndex: isTop ? 1 : 0,
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isTop ? 'grab' : 'default',
                ...(isTop ? { x, rotate, opacity } : {})
            }}
            variants={variants}
            initial="enter"
            animate={isTop ? "center" : backCardStyle}
            exit="exit"
            custom={exitDirection}
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={isTop ? onDragEnd : undefined}
            whileTap={isTop ? { cursor: 'grabbing' } : {}}
        >
            <div className="card">
                <div className="card-content">
                    <h3>{card.title}</h3>
                    <div className="card-body">
                        {card.content}
                    </div>
                    <div className="card-footer">
                        <span>{card.timestamp ? new Date(card.timestamp).toLocaleDateString() : ''}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CardStack;
