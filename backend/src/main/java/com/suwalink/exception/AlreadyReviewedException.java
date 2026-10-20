package com.suwalink.exception;

/** A medicine suggestion that was already approved or rejected can't be reviewed again. */
public class AlreadyReviewedException extends RuntimeException {

    public AlreadyReviewedException(String message) {
        super(message);
    }
}
