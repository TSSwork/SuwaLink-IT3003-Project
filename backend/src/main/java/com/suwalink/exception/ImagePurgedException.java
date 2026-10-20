package com.suwalink.exception;

/** The prescription image file was deleted by the retention job. */
public class ImagePurgedException extends RuntimeException {

    public ImagePurgedException() {
        super("This prescription image has been deleted under the data retention policy");
    }
}
