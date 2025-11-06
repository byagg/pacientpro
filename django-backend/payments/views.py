import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# Set Stripe API key (will be moved to settings)
stripe.api_key = "sk_test_..."  # Replace with your Stripe secret key


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    try:
        amount = request.data.get('amount')  # Amount in cents
        currency = request.data.get('currency', 'eur')
        
        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=int(amount),
            currency=currency,
            metadata={
                'user_id': request.user.id,
                'user_email': request.user.email,
            }
        )
        
        return Response({
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response({'error': 'Payment intent ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Retrieve the PaymentIntent to check status
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status == 'succeeded':
            # Payment was successful - save to database, send confirmation email, etc.
            return Response({
                'status': 'success',
                'message': 'Payment completed successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'failed',
                'message': 'Payment was not completed'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
